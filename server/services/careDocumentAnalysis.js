import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARE_UPLOAD_DIR = path.resolve(__dirname, "../uploads/user-care");

const MAX_DOCS = 4;
const MAX_IMAGES = 3;
const MAX_PDF_CHARS = 6000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const PDF_EXTS = new Set([".pdf"]);

/**
 * Resolve a care-doc relative URL to an absolute path inside uploads/user-care only.
 * @param {string} relativePath
 * @returns {string|null}
 */
export function resolveCareDocumentAbsPath(relativePath) {
  const raw = String(relativePath || "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/\\/g, "/");
  const marker = "/uploads/user-care/";
  const idx = normalized.indexOf(marker);
  const basename =
    idx >= 0
      ? path.basename(normalized.slice(idx + marker.length))
      : path.basename(normalized.replace(/^\/?uploads\/user-care\//, ""));

  if (!basename || basename === "." || basename === "..") return null;

  const abs = path.resolve(CARE_UPLOAD_DIR, basename);
  if (!abs.startsWith(CARE_UPLOAD_DIR + path.sep) && abs !== CARE_UPLOAD_DIR) {
    return null;
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return abs;
}

function mimeForExt(ext) {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

/**
 * Extract text from a PDF. Prefers system `pdftotext`, falls back to pdf-parse.
 * @param {string} absPath
 * @returns {Promise<string>}
 */
async function extractPdfText(absPath) {
  try {
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-layout", absPath, "-"],
      { timeout: 15000, maxBuffer: 2 * 1024 * 1024 },
    );
    const text = String(stdout || "").replace(/\s+/g, " ").trim();
    if (text) return text.slice(0, MAX_PDF_CHARS);
  } catch {
    // fall through
  }

  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const buf = fs.readFileSync(absPath);
    const parsed = await pdfParse(buf);
    return String(parsed?.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_PDF_CHARS);
  } catch {
    return "";
  }
}

/**
 * Read allowed care documents into text excerpts + image data-URLs for GPT.
 * @param {Array<{ path?: string, originalName?: string, mimeType?: string }>} docs
 * @returns {Promise<{ textNotes: string, imageParts: object[], analyzedCount: number }>}
 */
export async function prepareCareDocumentsForRecommend(docs = []) {
  const list = (Array.isArray(docs) ? docs : [])
    .filter((d) => d && d.path)
    .slice(0, MAX_DOCS);

  const textChunks = [];
  const imageParts = [];
  let analyzedCount = 0;

  for (const doc of list) {
    const abs = resolveCareDocumentAbsPath(doc.path);
    if (!abs) continue;

    const ext = path.extname(abs).toLowerCase();
    const label = String(doc.originalName || path.basename(abs)).slice(0, 120);

    try {
      if (IMAGE_EXTS.has(ext) && imageParts.length < MAX_IMAGES) {
        const stat = fs.statSync(abs);
        if (stat.size > MAX_IMAGE_BYTES) {
          textChunks.push(`[Image "${label}" skipped — file too large for analysis]`);
          continue;
        }
        const buf = fs.readFileSync(abs);
        const b64 = buf.toString("base64");
        const mime = String(doc.mimeType || "").startsWith("image/")
          ? doc.mimeType
          : mimeForExt(ext);
        imageParts.push({
          type: "image_url",
          image_url: {
            url: `data:${mime};base64,${b64}`,
            detail: "low",
          },
        });
        analyzedCount += 1;
        continue;
      }

      if (PDF_EXTS.has(ext)) {
        const text = await extractPdfText(abs);
        if (text) {
          textChunks.push(`--- PDF "${label}" ---\n${text}`);
          analyzedCount += 1;
        } else {
          // Image-only / scanned PDF: still count as present; vision path prefers PNG/JPG.
          textChunks.push(
            `[PDF "${label}" had little extractable text — prefer a text PDF or PNG/JPG photo of the page]`,
          );
        }
        continue;
      }

      textChunks.push(
        `[Document "${label}" uploaded (${ext || "unknown"}). Prefer PDF/image for auto-analysis; use form fields for key needs.]`,
      );
    } catch (err) {
      textChunks.push(
        `[Could not analyze "${label}": ${String(err?.message || "read error").slice(0, 120)}]`,
      );
    }
  }

  return {
    textNotes: textChunks.join("\n\n").trim(),
    imageParts,
    analyzedCount,
  };
}
