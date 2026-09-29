import fs from "fs";
import os from "os";
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
const MAX_PDF_CHARS = 8000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MIN_USEFUL_PDF_CHARS = 40;

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
 * Rasterize first pages of a PDF to PNG data-URLs for vision models.
 * @param {string} absPath
 * @param {number} [maxPages]
 * @returns {Promise<object[]>}
 */
async function pdfPagesToImageParts(absPath, maxPages = 2) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "carematch-pdf-"));
  const prefix = path.join(tmpRoot, "page");
  try {
    await execFileAsync(
      "pdftoppm",
      ["-png", "-r", "150", "-f", "1", "-l", String(maxPages), absPath, prefix],
      { timeout: 20000 },
    );
    const files = fs
      .readdirSync(tmpRoot)
      .filter((name) => name.endsWith(".png"))
      .sort()
      .slice(0, maxPages);

    return files.map((name) => {
      const buf = fs.readFileSync(path.join(tmpRoot, name));
      return {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${buf.toString("base64")}`,
          detail: "high",
        },
      };
    });
  } catch {
    return [];
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

function pushImageFromFile(absPath, mimeType, imageParts) {
  if (imageParts.length >= MAX_IMAGES) return false;
  const stat = fs.statSync(absPath);
  if (stat.size > MAX_IMAGE_BYTES) return false;
  const buf = fs.readFileSync(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const mime = String(mimeType || "").startsWith("image/")
    ? mimeType
    : mimeForExt(ext);
  imageParts.push({
    type: "image_url",
    image_url: {
      url: `data:${mime};base64,${buf.toString("base64")}`,
      detail: "high",
    },
  });
  return true;
}

/**
 * Read allowed care documents into text excerpts + image data-URLs for GPT.
 * @param {Array<{ path?: string, originalName?: string, mimeType?: string }>} docs
 * @returns {Promise<{ textNotes: string, imageParts: object[], analyzedCount: number, rawPdfText: string }>}
 */
export async function prepareCareDocumentsForRecommend(docs = []) {
  const list = (Array.isArray(docs) ? docs : [])
    .filter((d) => d && d.path)
    .slice(0, MAX_DOCS);

  const textChunks = [];
  const imageParts = [];
  let analyzedCount = 0;
  let rawPdfText = "";

  for (const doc of list) {
    const abs = resolveCareDocumentAbsPath(doc.path);
    if (!abs) {
      textChunks.push(
        `[Could not open uploaded file "${String(doc.originalName || doc.path || "").slice(0, 80)}"]`,
      );
      continue;
    }

    const ext = path.extname(abs).toLowerCase();
    const label = String(doc.originalName || path.basename(abs)).slice(0, 120);

    try {
      if (IMAGE_EXTS.has(ext)) {
        const ok = pushImageFromFile(abs, doc.mimeType, imageParts);
        if (ok) analyzedCount += 1;
        else {
          textChunks.push(`[Image "${label}" skipped — file too large for analysis]`);
        }
        continue;
      }

      if (PDF_EXTS.has(ext)) {
        const text = await extractPdfText(abs);
        if (text && text.length >= MIN_USEFUL_PDF_CHARS) {
          textChunks.push(`--- PDF "${label}" ---\n${text}`);
          rawPdfText = `${rawPdfText}\n${text}`.trim().slice(0, MAX_PDF_CHARS);
          analyzedCount += 1;
        } else {
          const pageImages = await pdfPagesToImageParts(abs, 2);
          if (pageImages.length > 0) {
            for (const part of pageImages) {
              if (imageParts.length >= MAX_IMAGES) break;
              imageParts.push(part);
            }
            analyzedCount += 1;
            textChunks.push(
              `[PDF "${label}" rendered as image(s) for AI reading${text ? `; partial text also found` : ""}]`,
            );
            if (text) {
              rawPdfText = `${rawPdfText}\n${text}`.trim().slice(0, MAX_PDF_CHARS);
            }
          } else if (text) {
            textChunks.push(`--- PDF "${label}" ---\n${text}`);
            rawPdfText = `${rawPdfText}\n${text}`.trim().slice(0, MAX_PDF_CHARS);
            analyzedCount += 1;
          } else {
            textChunks.push(
              `[PDF "${label}" could not be read as text or image — try a PNG/JPG photo]`,
            );
          }
        }
        continue;
      }

      textChunks.push(
        `[Document "${label}" uploaded (${ext || "unknown"}). Prefer PDF/image for auto-analysis.]`,
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
    rawPdfText,
  };
}

function parseJsonObject(raw) {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : text;
    const jsonMatch = candidate.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : candidate);
  } catch {
    return { medical_issues: text.slice(0, 4000) };
  }
}

/**
 * Use OpenAI to turn uploaded medical docs/images into form field values.
 * @param {Array<{ path?: string, originalName?: string, mimeType?: string }>} docs
 * @returns {Promise<{ medical_issues: string, bio: string, care_background: string, desired_services: string[], desired_amenities: string[], documentsAnalyzed: number }>}
 */
export async function extractMedicalHistoryFieldsFromDocuments(docs = []) {
  const prepared = await prepareCareDocumentsForRecommend(docs);
  const empty = {
    medical_issues: "",
    bio: "",
    care_background: "",
    desired_services: [],
    desired_amenities: [],
    documentsAnalyzed: 0,
  };

  if (
    !prepared.analyzedCount &&
    !prepared.textNotes &&
    prepared.imageParts.length === 0 &&
    !prepared.rawPdfText
  ) {
    return empty;
  }

  const fallbackFromPdf = () => {
    const text = String(prepared.rawPdfText || "").trim();
    if (!text) return null;

    const compact = text.replace(/\s+/g, " ").trim();
    const patient =
      compact.match(/Patient:\s*([A-Za-z][A-Za-z .'-]{1,60}?)(?:\s+Age:|\s+\d{1,3}\s|$)/i)?.[1]?.trim() ||
      "";
    const age = compact.match(/Age:\s*(\d{1,3})/i)?.[1] || "";
    const address =
      compact.match(
        /Address context:\s*([A-Za-z0-9 ,.-]{3,80}?)(?:\s+Primary diagnoses:|\s+Functional needs:|$)/i,
      )?.[1]?.trim() || "";
    const notes =
      compact.match(
        /Notes:\s*(.+?)(?:\s*$)/i,
      )?.[1]?.trim() || "";
    const setting =
      compact.match(
        /Care setting recommendation:\s*([A-Za-z /-]{3,60}?)(?:\s+Timeline:|\s+Monthly|$)/i,
      )?.[1]?.trim() || "";
    const timeline =
      compact.match(
        /Timeline:\s*([^.]+?(?:days|weeks|months)[^.]*?)(?:\s+Monthly|\s+Search|\.|$)/i,
      )?.[1]?.trim() || "";

    const bioParts = [];
    if (patient && age) bioParts.push(`${patient} is ${age} years old`);
    else if (patient) bioParts.push(patient);
    if (address) bioParts.push(`Looking for care near ${address}`);
    if (notes) bioParts.push(notes);
    const bio = bioParts.join(". ").replace(/\s+/g, " ").trim();

    const bgParts = [];
    if (setting) bgParts.push(`Seeking ${setting}`);
    if (timeline) bgParts.push(timeline);
    const care_background = bgParts.join(". ").replace(/\s+/g, " ").trim();

    return {
      medical_issues: text.slice(0, 4000),
      bio: bio.slice(0, 2000),
      care_background: care_background.slice(0, 4000),
      desired_services: [],
      desired_amenities: [],
      documentsAnalyzed: prepared.analyzedCount || 1,
    };
  };

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    const fallback = fallbackFromPdf();
    if (fallback) return fallback;
    const err = new Error("OpenAI is not configured");
    err.statusCode = 503;
    throw err;
  }

  const { OPENAI_CHAT_MODEL } = await import("../config/chatConstants.js");

  const promptText =
    `Read the attached medical record document(s) / images and extract structured care fields for a family medical history form.\n\n` +
    `Return ONLY valid JSON (no markdown) with this shape:\n` +
    `{\n` +
    `  "medical_issues": "diagnoses, medications, mobility, conditions — clear plain sentences",\n` +
    `  "bio": "1-3 sentence intro: patient name, age, location, personality / family context from the doc",\n` +
    `  "care_background": "living situation, prior care, care setting, timeline, budget if present",\n` +
    `  "desired_services": ["short service phrases"],\n` +
    `  "desired_amenities": ["short amenity phrases"]\n` +
    `}\n\n` +
    `Rules:\n` +
    `- medical_issues is REQUIRED when any clinical content exists; write a complete readable summary.\n` +
    `- bio is REQUIRED when patient name/age/notes exist — synthesize a short intro from those facts (do not leave blank).\n` +
    `- care_background should include timeline / setting / living situation when mentioned.\n` +
    `- Do not invent facts not supported by the documents.\n` +
    `- Keep arrays short (max 12 items each).\n` +
    `- If a field is truly unknown, use "" or [].\n\n` +
    (prepared.textNotes || prepared.rawPdfText
      ? `Document notes / extracted text:\n${prepared.textNotes || prepared.rawPdfText}`
      : "Use the attached image(s) as the source.");

  const userContent =
    prepared.imageParts.length > 0
      ? [{ type: "text", text: promptText }, ...prepared.imageParts]
      : promptText;

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You extract medical history fields from documents for CareMatch. Reply with JSON only.",
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 1200,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });
  } catch (err) {
    const fallback = fallbackFromPdf();
    if (fallback) return fallback;
    const error = new Error(err?.message || "Failed to reach OpenAI");
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallback = fallbackFromPdf();
    if (fallback) return fallback;
    const rawMsg = String(data?.error?.message || "").trim();
    const error = new Error(rawMsg || `OpenAI error (${response.status})`);
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }

  const raw = String(data?.choices?.[0]?.message?.content || "").trim();
  const parsed = parseJsonObject(raw);

  const toList = (value) => {
    if (Array.isArray(value)) {
      return value.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12);
    }
    if (value == null || value === "") return [];
    return String(value)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);
  };

  let medicalIssues = String(parsed.medical_issues || "").trim().slice(0, 4000);
  if (!medicalIssues && prepared.rawPdfText) {
    medicalIssues = prepared.rawPdfText.slice(0, 4000);
  }

  return {
    medical_issues: medicalIssues,
    bio: String(parsed.bio || "").trim().slice(0, 2000),
    care_background: String(parsed.care_background || "").trim().slice(0, 4000),
    desired_services: toList(parsed.desired_services),
    desired_amenities: toList(parsed.desired_amenities),
    documentsAnalyzed: prepared.analyzedCount || (medicalIssues ? 1 : 0),
  };
}
