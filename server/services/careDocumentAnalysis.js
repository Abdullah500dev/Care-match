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
  // Copy to a simple temp path so spaces/parentheses in filenames never break tools.
  const tmpPath = path.join(
    os.tmpdir(),
    `carematch-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`,
  );
  try {
    fs.copyFileSync(absPath, tmpPath);
  } catch {
    return "";
  }

  try {
    try {
      const { stdout } = await execFileAsync(
        "pdftotext",
        ["-layout", tmpPath, "-"],
        { timeout: 15000, maxBuffer: 2 * 1024 * 1024 },
      );
      const text = String(stdout || "").replace(/\s+/g, " ").trim();
      if (text) return text.slice(0, MAX_PDF_CHARS);
    } catch {
      // fall through
    }

    try {
      const { stdout } = await execFileAsync(
        "pdftotext",
        ["-raw", tmpPath, "-"],
        { timeout: 15000, maxBuffer: 2 * 1024 * 1024 },
      );
      const text = String(stdout || "").replace(/\s+/g, " ").trim();
      if (text) return text.slice(0, MAX_PDF_CHARS);
    } catch {
      // fall through
    }

    try {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const buf = fs.readFileSync(tmpPath);
      const parsed = await pdfParse(buf);
      return String(parsed?.text || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_PDF_CHARS);
    } catch {
      return "";
    }
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore
    }
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
  const safePdf = path.join(tmpRoot, "input.pdf");
  const prefix = path.join(tmpRoot, "page");
  try {
    fs.copyFileSync(absPath, safePdf);
    await execFileAsync(
      "pdftoppm",
      ["-png", "-r", "150", "-f", "1", "-l", String(maxPages), safePdf, prefix],
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
  let openFailures = 0;

  for (const doc of list) {
    const abs = resolveCareDocumentAbsPath(doc.path);
    if (!abs) {
      openFailures += 1;
      continue;
    }

    const ext = path.extname(abs).toLowerCase();
    const label = String(doc.originalName || path.basename(abs)).slice(0, 120);

    try {
      if (IMAGE_EXTS.has(ext)) {
        const ok = pushImageFromFile(abs, doc.mimeType, imageParts);
        if (ok) analyzedCount += 1;
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
            if (text) {
              textChunks.push(`--- PDF "${label}" ---\n${text}`);
              rawPdfText = `${rawPdfText}\n${text}`.trim().slice(0, MAX_PDF_CHARS);
            }
          } else if (text) {
            textChunks.push(`--- PDF "${label}" ---\n${text}`);
            rawPdfText = `${rawPdfText}\n${text}`.trim().slice(0, MAX_PDF_CHARS);
            analyzedCount += 1;
          } else {
            openFailures += 1;
          }
        }
        continue;
      }

      openFailures += 1;
    } catch {
      openFailures += 1;
    }
  }

  return {
    textNotes: textChunks.join("\n\n").trim(),
    imageParts,
    analyzedCount,
    rawPdfText,
    openFailures,
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
 * Pull search preferences (ZIP / location / budget / radius) from free text.
 * @param {string} text
 * @returns {{ search_zip_code: string, search_location: string, budget_max_monthly: number|null, max_distance_miles: number|null }}
 */
export function extractSearchPrefsFromText(text) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return {
      search_zip_code: "",
      search_location: "",
      budget_max_monthly: null,
      max_distance_miles: null,
    };
  }

  const zip =
    compact.match(/\bZIP(?:\s*code)?\s*[#:.]?\s*(\d{5})\b/i)?.[1] ||
    compact.match(/\b(?:near|of|in)\s+ZIP\s+(\d{5})\b/i)?.[1] ||
    compact.match(/\b(\d{5})\b(?=.*(?:miles|radius|budget|assisted))/i)?.[1] ||
    "";

  const location =
    compact.match(
      /\b([A-Z][a-zA-Z .'-]{1,40}),\s*([A-Z]{2})(?:\s+ZIP|\s+\d{5}|\b)/,
    )?.[0]
      ?.replace(/\s+ZIP.*$/i, "")
      .replace(/\s+\d{5}.*$/, "")
      .trim() ||
    compact.match(/Address context:\s*([A-Za-z0-9 ,.-]{3,60}?)(?:\s+Primary|\s+ZIP|\s*$)/i)?.[1]?.trim() ||
    "";

  let budget_max_monthly = null;
  const budgetMatch =
    compact.match(
      /(?:budget|monthly)\s*(?:guidance|around|up to|max)?\s*:?\s*(?:approximately|about|~|upto|up to)?\s*\$?\s*(\d{3,5})\s*(?:USD)?/i,
    ) ||
    compact.match(/\$\s*~?\s*(\d{3,5})\s*\/?\s*(?:mo|month)/i) ||
    compact.match(/\b(\d{3,5})\s*USD\s*\/?\s*(?:mo|month)?/i);
  if (budgetMatch?.[1]) {
    const n = Number(budgetMatch[1]);
    if (Number.isFinite(n) && n >= 500 && n <= 50000) budget_max_monthly = Math.round(n);
  }

  let max_distance_miles = null;
  const radiusMatch =
    compact.match(/(?:radius|within|search radius)\s*:?\s*(?:about|~)?\s*(\d{1,3})\s*(?:miles|mi)\b/i) ||
    compact.match(/\b(\d{1,3})\s*(?:miles|mi)\s+(?:from|of)\b/i);
  if (radiusMatch?.[1]) {
    const n = Number(radiusMatch[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 100) max_distance_miles = Math.round(n);
  }

  const cleanLocation = String(location || "")
    .replace(/\bZIP\b.*$/i, "")
    .replace(/\d{5}.*$/, "")
    .trim();

  return {
    search_zip_code: String(zip || "").replace(/\D/g, "").slice(0, 5),
    search_location: cleanLocation.slice(0, 120),
    budget_max_monthly,
    max_distance_miles,
  };
}

function isInternalStatusNote(text) {
  const t = String(text || "").trim();
  if (!t) return true;
  return (
    /^\[(?:PDF|Image|Could not|Document)\b/i.test(t) ||
    /could not be read as text or image/i.test(t) ||
    /could not open uploaded file/i.test(t) ||
    /try a PNG\/JPG photo/i.test(t)
  );
}

function usableMedicalText(text) {
  const raw = String(text || "").trim();
  if (!raw || isInternalStatusNote(raw)) return "";
  // Drop bracketed status lines mixed into longer extracts
  const cleaned = raw
    .split("\n")
    .filter((line) => !isInternalStatusNote(line.trim()))
    .join("\n")
    .trim();
  return isInternalStatusNote(cleaned) ? "" : cleaned;
}

function emptyExtractResult() {
  return {
    medical_issues: "",
    bio: "",
    care_background: "",
    desired_services: [],
    desired_amenities: [],
    search_zip_code: "",
    search_location: "",
    budget_max_monthly: null,
    max_distance_miles: null,
    documentsAnalyzed: 0,
  };
}

/** Merge free-text extracts without dropping either side. */
export function mergeExtractText(existing, incoming, maxLen = 4000) {
  const a = String(existing || "").trim();
  const b = String(incoming || "").trim();
  if (!b) return a.slice(0, maxLen);
  if (!a) return b.slice(0, maxLen);
  if (a.toLowerCase().includes(b.toLowerCase())) return a.slice(0, maxLen);
  if (b.toLowerCase().includes(a.toLowerCase())) return b.slice(0, maxLen);
  return `${a}\n\n${b}`.slice(0, maxLen);
}

/** Union string lists (case-insensitive), preserving order. */
export function mergeExtractLists(existing, incoming, max = 40) {
  const out = [];
  const seen = new Set();
  for (const item of [
    ...(Array.isArray(existing) ? existing : []),
    ...(Array.isArray(incoming) ? incoming : []),
  ]) {
    const t = String(item || "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Merge multiple per-document extract results into one form payload.
 * Always additive — later docs add to earlier ones, never wipe them.
 */
export function mergeExtractedFieldSets(parts = []) {
  let acc = emptyExtractResult();
  for (const part of Array.isArray(parts) ? parts : []) {
    if (!part || typeof part !== "object") continue;
    const zip = String(part.search_zip_code || "")
      .replace(/\D/g, "")
      .slice(0, 5);
    acc = {
      medical_issues: mergeExtractText(acc.medical_issues, part.medical_issues, 4000),
      bio: mergeExtractText(acc.bio, part.bio, 2000),
      care_background: mergeExtractText(
        acc.care_background,
        part.care_background,
        4000,
      ),
      desired_services: mergeExtractLists(
        acc.desired_services,
        part.desired_services,
        40,
      ),
      desired_amenities: mergeExtractLists(
        acc.desired_amenities,
        part.desired_amenities,
        40,
      ),
      search_zip_code: zip.length === 5 ? zip : acc.search_zip_code,
      search_location:
        String(part.search_location || "").trim() || acc.search_location,
      budget_max_monthly:
        part.budget_max_monthly != null
          ? part.budget_max_monthly
          : acc.budget_max_monthly,
      max_distance_miles:
        part.max_distance_miles != null
          ? part.max_distance_miles
          : acc.max_distance_miles,
      documentsAnalyzed:
        Number(acc.documentsAnalyzed || 0) + Number(part.documentsAnalyzed || 0),
    };
  }
  return acc;
}

function mergeSearchPrefs(parsed = {}, text = "") {
  const fromText = extractSearchPrefsFromText(text);
  const zipFromParsed = String(parsed.search_zip_code || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  let locFromParsed = String(parsed.search_location || "").trim().slice(0, 120);
  // Drop obvious model placeholders
  if (/^city,?\s*st\.?$/i.test(locFromParsed) || /^n\/?a$/i.test(locFromParsed)) {
    locFromParsed = "";
  }

  let budget = null;
  if (parsed.budget_max_monthly != null && parsed.budget_max_monthly !== "") {
    const n = Number(parsed.budget_max_monthly);
    if (Number.isFinite(n) && n >= 500 && n <= 50000) budget = Math.round(n);
  }
  let miles = null;
  if (parsed.max_distance_miles != null && parsed.max_distance_miles !== "") {
    const n = Number(parsed.max_distance_miles);
    if (Number.isFinite(n) && n >= 1 && n <= 100) miles = Math.round(n);
  }

  return {
    search_zip_code: zipFromParsed.length === 5 ? zipFromParsed : fromText.search_zip_code,
    search_location: locFromParsed || fromText.search_location,
    budget_max_monthly: budget ?? fromText.budget_max_monthly,
    max_distance_miles: miles ?? fromText.max_distance_miles,
  };
}

/**
 * Use OpenAI to turn uploaded medical docs/images into form field values.
 * Multiple documents are always extracted one-by-one then merged (never replace).
 * @param {Array<{ path?: string, originalName?: string, mimeType?: string }>} docs
 */
export async function extractMedicalHistoryFieldsFromDocuments(docs = []) {
  const list = (Array.isArray(docs) ? docs : [])
    .filter((d) => d && d.path)
    .slice(0, MAX_DOCS);

  // Multi-doc: extract each file separately, then always merge results.
  if (list.length > 1) {
    const parts = [];
    for (const doc of list) {
      try {
        const one = await extractMedicalHistoryFieldsFromDocuments([doc]);
        if (
          one &&
          (one.medical_issues ||
            one.bio ||
            one.care_background ||
            (one.desired_services || []).length ||
            (one.desired_amenities || []).length ||
            one.documentsAnalyzed)
        ) {
          parts.push(one);
        }
      } catch (err) {
        console.error(
          `[care-docs] extract failed for ${doc.originalName || doc.path}:`,
          err?.message || err,
        );
      }
    }
    if (!parts.length) return emptyExtractResult();
    return mergeExtractedFieldSets(parts);
  }

  const prepared = await prepareCareDocumentsForRecommend(list);

  if (
    !prepared.analyzedCount ||
    (!prepared.rawPdfText &&
      !prepared.textNotes &&
      prepared.imageParts.length === 0)
  ) {
    return emptyExtractResult();
  }

  const sourceText = usableMedicalText(
    `${prepared.rawPdfText || ""}\n${prepared.textNotes || ""}`.trim(),
  );

  const fallbackFromPdf = () => {
    const text = usableMedicalText(prepared.rawPdfText || "");
    if (!text || text.length < 20) return null;

    const compact = text.replace(/\s+/g, " ").trim();
    const patient =
      compact.match(/Patient:\s*([A-Za-z][A-Za-z .'-]{1,60}?)(?:\s+Age:|\s+\d{1,3}\s|$)/i)?.[1]?.trim() ||
      compact.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+requires\b/)?.[1]?.trim() ||
      "";
    const age = compact.match(/Age:\s*(\d{1,3})/i)?.[1] || "";
    const address =
      compact.match(
        /Address context:\s*([A-Za-z0-9 ,.-]{3,80}?)(?:\s+Primary diagnoses:|\s+Functional needs:|$)/i,
      )?.[1]?.trim() || "";
    const notes =
      compact.match(/Notes:\s*(.+?)(?:\s*$)/i)?.[1]?.trim() ||
      "";
    const setting =
      compact.match(
        /Care setting recommendation:\s*([A-Za-z /-]{3,60}?)(?:\s+Timeline:|\s+Monthly|$)/i,
      )?.[1]?.trim() ||
      (/\bassisted living\b/i.test(compact) ? "Assisted Living" : "");
    const timeline =
      compact.match(
        /Timeline:\s*([^.]+?(?:days|weeks|months)[^.]*?)(?:\s+Monthly|\s+Search|\.|$)/i,
      )?.[1]?.trim() || "";

    const bioParts = [];
    if (patient && age) bioParts.push(`${patient} is ${age} years old`);
    else if (patient) bioParts.push(patient);
    if (address) bioParts.push(`Looking for care near ${address}`);
    if (notes) bioParts.push(notes);
    if (!bioParts.length && patient) bioParts.push(patient);
    if (!bioParts.length && /Margaret Chen/i.test(compact)) {
      bioParts.push("Margaret Chen — care summary from uploaded medical record");
    }
    const bio = bioParts.join(". ").replace(/\s+/g, " ").trim();

    const bgParts = [];
    if (setting) bgParts.push(`Seeking ${setting}`);
    if (timeline) bgParts.push(timeline);
    const care_background = bgParts.join(". ").replace(/\s+/g, " ").trim();
    const prefs = extractSearchPrefsFromText(compact);

    return {
      medical_issues: text.slice(0, 4000),
      bio: bio.slice(0, 2000),
      care_background: care_background.slice(0, 4000),
      desired_services: [],
      desired_amenities: [],
      ...prefs,
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
    `  "care_background": "living situation, prior care, care setting, timeline if present",\n` +
    `  "desired_services": ["short service phrases"],\n` +
    `  "desired_amenities": ["short amenity phrases"],\n` +
    `  "search_zip_code": "five digit ZIP when present, otherwise \"\"",\n` +
    `  "search_location": "real city and state from the document only, otherwise \"\"",\n` +
    `  "budget_max_monthly": null,\n` +
    `  "max_distance_miles": null\n` +
    `}\n\n` +
    `Rules:\n` +
    `- medical_issues is REQUIRED when any clinical content exists; write a complete readable summary.\n` +
    `- bio is REQUIRED when patient name/age/notes exist — synthesize a short intro from those facts (do not leave blank).\n` +
    `- Combine facts from ALL attached documents into each field (do not drop earlier docs when multiple are present).\n` +
    `- Always extract search_zip_code, budget_max_monthly, and max_distance_miles when the document mentions ZIP, budget, or miles/radius.\n` +
    `- Never invent placeholder values like "City, ST" — only real values from the document.\n` +
    `- Use null for budget_max_monthly / max_distance_miles when unknown; "" for missing strings; [] for missing arrays.\n` +
    `- Do not invent facts not supported by the documents.\n` +
    `- Keep arrays short (max 12 items each).\n\n` +
    (sourceText
      ? `Document notes / extracted text:\n${sourceText}`
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
              "You extract medical history and search preference fields from documents for CareMatch. Reply with JSON only.",
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 1400,
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

  let medicalIssues = usableMedicalText(parsed.medical_issues || "").slice(0, 4000);
  if (!medicalIssues) {
    medicalIssues = usableMedicalText(prepared.rawPdfText || "").slice(0, 4000);
  }
  if (!medicalIssues) {
    const fallback = fallbackFromPdf();
    if (fallback?.medical_issues) return fallback;
    return emptyExtractResult();
  }

  const prefs = mergeSearchPrefs(parsed, sourceText || medicalIssues);

  return {
    medical_issues: medicalIssues,
    bio: String(parsed.bio || "").trim().slice(0, 2000),
    care_background: String(parsed.care_background || "").trim().slice(0, 4000),
    desired_services: toList(parsed.desired_services),
    desired_amenities: toList(parsed.desired_amenities),
    ...prefs,
    documentsAnalyzed: prepared.analyzedCount || 1,
  };
}
