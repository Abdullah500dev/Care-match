import { OPENAI_CHAT_MODEL } from "../config/chatConstants.js";
import {
  extractIntakeJsonBlock,
  normalizeIntakePreferences,
  parseBudgetLikeValue,
} from "./matchingEngine.js";
import { prepareCareDocumentsForRecommend } from "./careDocumentAnalysis.js";

const ASSISTED_ONLY = "assisted living";
const DEFAULT_MAX_MILES = 25;
const DEFAULT_BUDGET_MAX = 8000;

/**
 * Build a compact profile brief for Carrie-style intake extraction.
 * @param {object} profile
 * @param {string} [documentNotes]
 */
export function buildMedicalProfileBrief(profile = {}, documentNotes = "") {
  const services = Array.isArray(profile.desired_services)
    ? profile.desired_services.filter(Boolean).join(", ")
    : String(profile.desired_services || "").trim();
  const amenities = Array.isArray(profile.desired_amenities)
    ? profile.desired_amenities.filter(Boolean).join(", ")
    : String(profile.desired_amenities || "").trim();

  const parts = [
    "Family medical record for assisted living recommendations:",
    `Bio: ${String(profile.bio || "").trim() || "(none)"}`,
    `Medical issues: ${String(profile.medical_issues || "").trim() || "(none)"}`,
    `Background: ${String(profile.care_background || "").trim() || "(none)"}`,
    `Desired services: ${services || "(none)"}`,
    `Desired amenities: ${amenities || "(none)"}`,
    `Preferred ZIP: ${String(profile.search_zip_code || profile.zip_code || "").trim() || "(none)"}`,
    `Preferred location: ${String(profile.search_location || profile.location || "").trim() || "(none)"}`,
    `Budget max monthly USD: ${profile.budget_max_monthly ?? profile.budget_max ?? "(none)"}`,
    `Budget min monthly USD: ${profile.budget_min_monthly ?? profile.budget_min ?? "(none)"}`,
    `Search radius miles: ${profile.max_distance_miles ?? "(none)"}`,
  ];

  if (documentNotes) {
    parts.push(
      "",
      "Uploaded medical documents (extract diagnoses, mobility, meds, therapies, accessibility needs into amenities/services/personalityNotes):",
      documentNotes,
    );
  }

  return parts.join("\n");
}

/**
 * Use OpenAI (same model / CAREMATCH JSON block as Carrie) to turn a medical
 * record into intake preferences for facility discovery.
 * Optionally analyzes uploaded images (vision) and PDF text.
 *
 * @param {object} profile
 * @param {Array<{ path?: string, originalName?: string, mimeType?: string }>} [documents]
 * @returns {Promise<{ preferences: object|null, missing: string[], rawText?: string, documentsAnalyzed?: number }>}
 */
export async function extractPreferencesFromMedicalProfile(profile = {}, documents = []) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("OpenAI is not configured");
    err.statusCode = 503;
    throw err;
  }

  const prepared = await prepareCareDocumentsForRecommend(documents);
  const brief = buildMedicalProfileBrief(profile, prepared.textNotes);

  const userContent =
    prepared.imageParts.length > 0
      ? [
          {
            type: "text",
            text:
              `${brief}\n\nAlso review the attached medical image(s). Pull any care needs, diagnoses, mobility aids, or accessibility requirements into the intake JSON.`,
          },
          ...prepared.imageParts,
        ]
      : brief;

  const payload = {
    model: OPENAI_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          `You are Carrie, CareMatch AI. Extract assisted-living intake preferences from a family medical record and any uploaded medical documents/images. Output ONLY the CAREMATCH JSON block (no questions, no prose).\n\n` +
          `CRITICAL RULES:\n` +
          `1. primaryCareType and careLevels must always be assisted living only.\n` +
          `2. searchLocation MUST ONLY contain geographic names (City, State, ZIP). Never include budget or care-type phrases.\n` +
          `3. amenityMustHaves should be concise normalized phrases from desired amenities, services, medical needs, AND uploaded documents/images (e.g. wheelchair accessible, medication management, memory support).\n` +
          `4. personalityNotes should summarize bio + medical issues + background + document findings (max ~700 chars).\n` +
          `5. searchZipCode, budgetMaxMonthly, and maxDistanceMiles are REQUIRED when present in the record; use null only if truly absent.\n` +
          `6. snfReadiness is always false.\n` +
          `7. Prefer concrete care needs from documents over vague form text when they conflict on clinical details.\n\n` +
          `---CAREMATCH_INTAKE_JSON---\n` +
          `{\n` +
          `  "primaryCareType": "assisted living",\n` +
          `  "careLevels": ["assisted living"],\n` +
          `  "amenityMustHaves": [],\n` +
          `  "budgetMinMonthly": null,\n` +
          `  "budgetMaxMonthly": null,\n` +
          `  "searchLocation": "",\n` +
          `  "searchZipCode": null,\n` +
          `  "maxDistanceMiles": null,\n` +
          `  "visitationImportance": "medium",\n` +
          `  "personalityNotes": "",\n` +
          `  "snfReadiness": false\n` +
          `}\n` +
          `---END_CAREMATCH_INTAKE_JSON---`,
      },
      { role: "user", content: userContent },
    ],
    max_tokens: 900,
    temperature: 0.1,
  };

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const error = new Error(err?.message || "Failed to reach OpenAI");
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawMsg = String(data?.error?.message || "").trim();
    const error = new Error(rawMsg || `OpenAI error (${response.status})`);
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  const { prefs: rawPrefs } = extractIntakeJsonBlock(text);
  let prefs = normalizeIntakePreferences(rawPrefs || {});

  if (!prefs) {
    return {
      preferences: null,
      missing: ["searchZipCode", "budget", "maxDistanceMiles"],
      rawText: text,
      documentsAnalyzed: prepared.analyzedCount,
    };
  }

  // Explicit form overrides win over model guesses.
  const zipOverride = String(profile.search_zip_code || profile.zip_code || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  if (zipOverride.length === 5) {
    prefs.searchZipCode = zipOverride;
  }

  const locationOverride = String(profile.search_location || profile.location || "").trim();
  if (locationOverride) {
    prefs.searchLocation = locationOverride;
  } else if (!prefs.searchLocation && prefs.searchZipCode) {
    prefs.searchLocation = prefs.searchZipCode;
  }

  // ZIP is geographic truth. Drop GPT cities that conflict with the ZIP's state
  // (e.g. "Everett" + 80220 must not become a Washington search).
  try {
    const { stateFromUsZip } = await import("../scripts/usZipState.js");
    const { CITY_DEFAULT_STATE } = await import("../scripts/usCityDefaultState.js");
    const zip = String(prefs.searchZipCode || "").replace(/\D/g, "").slice(0, 5);
    const zipState = zip.length === 5 ? stateFromUsZip(zip) : "";
    if (zipState) {
      const loc = String(prefs.searchLocation || "").trim();
      const cityToken = loc
        .split(",")[0]
        ?.replace(/\b\d{5}(?:-\d{4})?\b/g, "")
        .trim()
        .toLowerCase()
        .split(/\s+/)[0];
      const cityState =
        cityToken && CITY_DEFAULT_STATE.has(cityToken)
          ? CITY_DEFAULT_STATE.get(cityToken)
          : "";
      if (cityState && cityState !== zipState) {
        // Prefer form location if it already matches ZIP state; else use "ST ZIP".
        const overrideCity = locationOverride
          .split(",")[0]
          ?.replace(/\b\d{5}(?:-\d{4})?\b/g, "")
          .trim()
          .toLowerCase()
          .split(/\s+/)[0];
        const overrideState =
          overrideCity && CITY_DEFAULT_STATE.has(overrideCity)
            ? CITY_DEFAULT_STATE.get(overrideCity)
            : "";
        if (locationOverride && (!overrideState || overrideState === zipState)) {
          prefs.searchLocation = locationOverride;
        } else {
          prefs.searchLocation = `${zipState} ${zip}`;
        }
      } else if (!loc) {
        prefs.searchLocation = `${zipState} ${zip}`;
      } else if (!new RegExp(`\\b${zipState}\\b`, "i").test(loc)) {
        prefs.searchLocation = `${loc.replace(/\b\d{5}(?:-\d{4})?\b/g, "").trim()}, ${zipState}`.replace(
          /^,\s*/,
          "",
        );
      }
    }
  } catch {
    // offline scripts optional
  }

  const budgetMaxOverride = parseBudgetLikeValue(
    profile.budget_max_monthly ?? profile.budget_max,
  );
  if (budgetMaxOverride != null) {
    prefs.budgetMaxMonthly = budgetMaxOverride;
  }

  const budgetMinOverride = parseBudgetLikeValue(
    profile.budget_min_monthly ?? profile.budget_min,
  );
  if (budgetMinOverride != null) {
    prefs.budgetMinMonthly = budgetMinOverride;
  }

  const milesOverride = Number(profile.max_distance_miles);
  if (Number.isFinite(milesOverride) && milesOverride > 0) {
    prefs.maxDistanceMiles = Math.round(milesOverride);
  }

  // Seed amenities/services from structured form lists.
  const amenityList = Array.isArray(profile.desired_amenities)
    ? profile.desired_amenities
    : String(profile.desired_amenities || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
  if (amenityList.length > 0) {
    const existing = Array.isArray(prefs.amenityMustHaves) ? prefs.amenityMustHaves : [];
    prefs.amenityMustHaves = [...new Set([...existing, ...amenityList.map(String)])];
  }

  prefs.primaryCareType = ASSISTED_ONLY;
  prefs.careLevels = [ASSISTED_ONLY];
  prefs.snfReadiness = false;

  // Sensible defaults so a filled medical record can still search.
  if (prefs.budgetMaxMonthly == null || prefs.budgetMaxMonthly <= 0) {
    prefs.budgetMaxMonthly = DEFAULT_BUDGET_MAX;
  }
  if (prefs.maxDistanceMiles == null || Number.isNaN(Number(prefs.maxDistanceMiles))) {
    prefs.maxDistanceMiles = DEFAULT_MAX_MILES;
  }

  const missing = [];
  const zip = String(prefs.searchZipCode || "").replace(/\D/g, "").slice(0, 5);
  if (zip.length !== 5) missing.push("searchZipCode");
  else prefs.searchZipCode = zip;

  if (prefs.budgetMaxMonthly == null || prefs.budgetMaxMonthly <= 0) {
    missing.push("budget");
  }
  if (prefs.maxDistanceMiles == null || Number(prefs.maxDistanceMiles) <= 0) {
    missing.push("maxDistanceMiles");
  }

  // Client-compat aliases (same as Carrie chat handoff).
  prefs.budgetMin = prefs.budgetMinMonthly;
  prefs.budgetMax = prefs.budgetMaxMonthly;
  prefs.budget_min = prefs.budgetMinMonthly;
  prefs.budget_max = prefs.budgetMaxMonthly;

  return {
    preferences: prefs,
    missing,
    rawText: text,
    documentsAnalyzed: prepared.analyzedCount,
  };
}
