import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import {
  CAREMATCH_CONVERSATION_SYSTEM_PROMPT,
  DEFAULT_CHAT_SYSTEM_PROMPT,
  OPENAI_CHAT_MODEL,
} from "../config/chatConstants.js";
import Facility from "../models/facilityModel.js";
import {
  extractIntakeJsonBlock,
  formatRecommendationsForChat,
  normalizeIntakePreferences,
  parseBudgetLikeValue,
  rankFacilities,
} from "../services/matchingEngine.js";
import { getCareMatchResults } from "../scripts/results.js";
import {
  formatAiDiscoveryMatchesForChat,
  intakePreferencesToAiSearchParams,
  mapAiDiscoveryFacilityToMatchRow,
} from "../services/aiDiscoveryBridge.js";
import { enrichDiscoveryFacilitiesWithPersonalizedScores } from "../services/discoveryPersonalizedScore.js";

const ASSISTED_ONLY_CARE_LEVEL = "assisted living";

const topValues = (items, limit = 6) => {
  const counts = new Map();
  items.forEach((v) => {
    const key = String(v || "").trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k]) => k);
};

const toCityHint = (address) => {
  const raw = String(address || "").trim();
  if (!raw) return "";
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  return parts[0] || "";
};

const summarizeFacilityInventory = (facilitiesLean) => {
  const facilities = Array.isArray(facilitiesLean) ? facilitiesLean : [];
  const count = facilities.length;
  if (count === 0) {
    return "Directory: no communities on file yet.";
  }
  const careOptions = topValues(
    facilities.flatMap((f) => (Array.isArray(f.care_levels) ? f.care_levels : [])),
    8
  );
  const amenityOptions = topValues(
    facilities.flatMap((f) => [
      ...(Array.isArray(f.amenities) ? f.amenities : []),
      ...(Array.isArray(f.services) ? f.services : []),
    ]),
    10
  );
  const areaOptions = topValues(
    facilities.map((f) => toCityHint(f.address)).filter(Boolean),
    12
  );
  const sampleNames = facilities
    .slice(0, 15)
    .map((f) => String(f.name || "Community").trim())
    .filter(Boolean);
  return [
    `Total communities: ${count}.`,
    careOptions.length ? `Care types seen in listings: ${careOptions.join(", ")}.` : null,
    areaOptions.length ? `We have facilities in these areas: ${areaOptions.join(" | ")}.` : null,
    amenityOptions.length ? `Common amenities/services: ${amenityOptions.join(", ")}.` : null,
    sampleNames.length ? `Example community names: ${sampleNames.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
};

const buildDirectoryContextBlock = (facilities) => {
  const summary = summarizeFacilityInventory(facilities);
  return `FACILITY_DIRECTORY_DATA (use only this for “what we have”; do not invent listings):\n${summary}`;
};

const parseBoundedBudgetAmount = (value) => {
  const n = parseBudgetLikeValue(value);
  if (n == null || !Number.isFinite(n)) return null;
  // Ignore likely non-budget values (e.g. ZIPs or malformed huge concatenations).
  if (n < 300 || n > 100000) return null;
  return n;
};

const inferBudgetRangeFromText = (text) => {
  const raw = String(text || "").toLowerCase().trim();
  if (!raw) return null;

  const range = raw.match(
    /(?:between\s+)?(\$?\s*\d[\d,]*(?:\.\d+)?\s*k?)\s*(?:-|to|and|through|up to)\s*(\$?\s*\d[\d,]*(?:\.\d+)?\s*k?)/
  );
  if (!range?.[1] || !range?.[2]) return null;

  const a = parseBoundedBudgetAmount(range[1]);
  const b = parseBoundedBudgetAmount(range[2]);
  if (a == null || b == null) return null;
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  if (min <= 0 || max <= 0) return null;
  return { min, max };
};

const inferBudgetFromText = (text) => {
  const raw = String(text || "").toLowerCase().trim();
  if (!raw) return null;

  const range = raw.match(
    /(?:between\s+)?(\$?\s*\d[\d,]*(?:\.\d+)?\s*k?)\s*(?:-|to|and|through|up to)\s*(\$?\s*\d[\d,]*(?:\.\d+)?\s*k?)/
  );
  if (range?.[1] && range?.[2]) {
    const a = parseBoundedBudgetAmount(range[1]);
    const b = parseBoundedBudgetAmount(range[2]);
    if (a != null && b != null) return Math.max(a, b);
  }

  const hasBudgetHints =
    /budget|month|monthly|\/mo|cost|price|afford|under|maximum|max|up to|range/i.test(raw) ||
    raw.includes("$");
  if (hasBudgetHints) {
    const single = parseBoundedBudgetAmount(raw);
    if (single != null) return single;
  }

  return null;
};

const assistantAskedForBudget = (text) =>
  /\b(budget|monthly|per month|\/mo|afford|price range|comfortable range|how much)\b/i.test(
    String(text || "")
  );

const inferBudgetFromMessages = (msgs) => {
  const thread = Array.isArray(msgs) ? msgs : [];

  for (let i = thread.length - 1; i >= 0; i -= 1) {
    if (thread[i]?.role !== "user") continue;
    const content = String(thread[i].content || "");

    const parsed = inferBudgetFromText(content);
    if (parsed != null && parsed > 0) return parsed;

    // Bare amount after Carrie asked for budget (e.g. "6000" or "$8k").
    for (let j = i - 1; j >= 0; j -= 1) {
      if (thread[j]?.role !== "assistant") continue;
      if (!assistantAskedForBudget(thread[j].content)) break;
      const amount = parseBoundedBudgetAmount(content);
      if (amount != null && amount > 0) return amount;
      break;
    }
  }

  return null;
};

const inferBudgetRangeFromMessages = (msgs) => {
  const users = msgs.filter((m) => m.role === "user").map((m) => m.content || "");
  for (let i = users.length - 1; i >= 0; i -= 1) {
    const parsed = inferBudgetRangeFromText(users[i]);
    if (parsed?.min != null && parsed?.max != null) return parsed;
  }
  return null;
};

const inferCareLevelsFromMessages = (msgs) => {
  return [ASSISTED_ONLY_CARE_LEVEL];
};

/**
 * We currently support assisted living only.
 */
const inferPrimaryCareTypeFromMessages = () => ASSISTED_ONLY_CARE_LEVEL;

/**
 * Infer ZIP code from messages (5-digit US ZIP).
 */
const inferZipCodeFromMessages = (msgs) => {
  const users = msgs.filter((m) => m.role === "user").map((m) => String(m.content || ""));
  for (let i = users.length - 1; i >= 0; i -= 1) {
    const text = users[i];
    // Explicit ZIP mention: "zip code 85001", "zipcode: 85001", "zip 85001"
    const explicit = text.match(/\b(?:zip(?:\s*code)?|zipcode)\s*(?:is|=|:)?\s*(\d{5})(?:-\d{4})?\b/i);
    if (explicit?.[1]) return explicit[1];
    // Standalone 5-digit number
    const standalone = text.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (standalone?.[1]) return standalone[1];
  }
  return null;
};

const inferLocationFromMessages = (msgs) => {
  const users = msgs.filter((m) => m.role === "user").map((m) => String(m.content || ""));
  for (let i = users.length - 1; i >= 0; i -= 1) {
    const text = users[i];
    const zipMatch = text.match(/\b(?:zip(?:\s*code)?|zipcode)\s*(?:is|=|:)?\s*(\d{5})(?:-\d{4})?\b/i);
    if (zipMatch?.[1]) return zipMatch[1];
    const standaloneZip = text.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (standaloneZip?.[1]) return standaloneZip[1];
    const m = text.match(
      /\b(?:in|near|around|close to|within)\s+([a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*){0,2}(?:\s*,\s*[a-zA-Z]{2}\b)?)/gi
    );
    if (!m || m.length === 0) continue;
    const last = m[m.length - 1].match(
      /\b(?:in|near|around|close to|within)\s+(.+)$/i
    );
    if (!last?.[1]) continue;
    // Stop at comma unless followed by exactly a 2-letter state abbreviation word
    let candidate = last[1].trim();
    const commaIdx = candidate.indexOf(",");
    if (commaIdx !== -1) {
      const afterComma = candidate.slice(commaIdx + 1).trim();
      if (/^[a-zA-Z]{2}$/.test(afterComma)) {
        // Keep "City, ST" format
        candidate = candidate.slice(0, commaIdx + 1 + 1 + afterComma.length);
      } else {
        // Strip everything from the comma onward
        candidate = candidate.slice(0, commaIdx);
      }
    }
    candidate = candidate.replace(/[.?!;:]+$/, "").trim();
    if (candidate.length >= 3) return candidate;
  }
  return "";
};

const parseDistanceMiles = (value) => {
  const n = Number.parseInt(String(value || ""), 10);
  if (Number.isNaN(n) || n <= 0 || n > 200) return null;
  return n;
};

const assistantAskedForRadius = (text) =>
  /\b(radius|how far|how many miles|distance|within how many|search radius|mile radius)\b/i.test(
    String(text || "")
  );

const inferMaxDistanceFromMessages = (msgs) => {
  const thread = Array.isArray(msgs) ? msgs : [];

  for (let i = thread.length - 1; i >= 0; i -= 1) {
    if (thread[i]?.role !== "user") continue;
    const text = String(thread[i].content || "").toLowerCase();

    const kmPattern =
      /\b(?:within|up to|no more than|under|around|about|at most)?\s*(\d{1,3})(?:\s*-\s*\d{1,3})?\s*(?:-|\s)*(?:km|kilometer|kilometers)\b/;
    const kmMatch = text.match(kmPattern);
    if (kmMatch?.[1]) {
      const value = parseDistanceMiles(kmMatch[1]);
      if (value != null) return value;
    }

    const milesPattern =
      /\b(?:within|up to|no more than|under|around|about|at most)?\s*(\d{1,3})(?:\s*-\s*\d{1,3})?\s*(?:-|\s)*(?:mile|miles|mi)\b/;
    const m = text.match(milesPattern);
    if (m?.[1]) {
      const value = parseDistanceMiles(m[1]);
      if (value != null) return value;
    }

    // Bare number reply after Carrie asked for radius (e.g. "25").
    for (let j = i - 1; j >= 0; j -= 1) {
      if (thread[j]?.role !== "assistant") continue;
      if (!assistantAskedForRadius(thread[j].content)) break;
      const bare = String(thread[i].content || "").trim().match(/^(\d{1,3})$/);
      if (bare?.[1]) {
        const value = parseDistanceMiles(bare[1]);
        if (value != null) return value;
      }
      break;
    }
  }

  return null;
};

const hasInferredBudget = (budget, range) =>
  (budget != null && budget > 0) || (range?.max != null && range.max > 0);

/** ZIP, monthly budget, and search radius must be present before facility matching. */
const getMissingMandatoryIntake = ({
  inferredZipCode,
  inferredBudget,
  inferredBudgetRange,
  inferredMaxDistance,
}) => {
  const missing = [];
  if (!inferredZipCode) missing.push("5-digit ZIP code");
  if (!hasInferredBudget(inferredBudget, inferredBudgetRange)) {
    missing.push("approximate monthly budget");
  }
  if (!inferredMaxDistance) missing.push("search radius in miles");
  return missing;
};

const inferAmenityMustHavesFromMessages = (msgs) => {
  const text = msgs
    .filter((m) => m.role === "user")
    .map((m) => String(m.content || ""))
    .join(" \n ")
    .toLowerCase();
  const amenities = new Set();

  if (/\bprivate room|private rooms?\b/i.test(text)) amenities.add("private room preferred");
  if (/\bpet[-\s]?friendly|pets?\b/i.test(text)) amenities.add("pet-friendly");
  if (/\bcouples?\b/i.test(text)) amenities.add("couples accommodation");
  if (/\bcultural|language[-\s]?specific|language specific\b/i.test(text)) {
    amenities.add("cultural or language-specific care");
  }
  if (/\bfaith[-\s]?based|religious\b/i.test(text)) amenities.add("faith-based community");
  if (/\blgbtq\+?|lgbt\b/i.test(text)) amenities.add("lgbtq+ welcoming");
  if (/\bdiabetes\b/i.test(text)) amenities.add("diabetes management");
  if (/\bphysical therapy|therapy services?|therapy\b/i.test(text)) {
    amenities.add("physical therapy");
  }
  if (/\bhospice\b/i.test(text)) amenities.add("hospice care");
  if (/\bmeals?|dining|nutrition\b/i.test(text)) amenities.add("meals and dining");
  if (/\bactivities|activity|social engagement|social activities\b/i.test(text)) {
    amenities.add("activities and social engagement");
  }
  if (/\bwheelchair[-\s]?accessible\b|\baccessible entrance\b|\bada\b/i.test(text)) {
    amenities.add("wheelchair accessible entrance");
  }
  if (/\bwheelchair[-\s]?accessible parking\b|\baccessible parking\b|\bparking\b/i.test(text)) {
    amenities.add("wheelchair accessible parking");
  }
  if (/\broom types?|private room|private rooms?|suite|semi-private\b/i.test(text)) {
    amenities.add("room types");
  }
  if (/\bstaff qualifications?|qualified staff|licensed staff|care staff\b/i.test(text)) {
    amenities.add("qualified care staff");
  }
  if (/\breviews?|ratings?|highly rated\b/i.test(text)) amenities.add("strong reviews");
  if (/\bsafety|safe|secure|security standards?\b/i.test(text)) {
    amenities.add("strong safety standards");
  }
  if (/\bmodern amenities|modern|updated|renovated\b/i.test(text)) {
    amenities.add("modern amenities");
  }
  if (/\brespiratory\b/i.test(text)) amenities.add("respiratory support");
  if (/\bdialysis\b/i.test(text)) amenities.add("dialysis access nearby");

  return [...amenities];
};

const sanitizeCarrieChatText = (text) =>
  String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

const buildFriendlyDiscoveryFailureMessage = (error, aiParams) => {
  const message = String(error?.message || "").trim();
  const location = String(aiParams?.location || "").trim();
  const zip = String(aiParams?.zip_code || "").trim();
  const locationLabel = [location, zip].filter(Boolean).join(" ");

  if (/geographic validation/i.test(message)) {
    return (
      "\n\n---\n**Your matches**\n" +
      `I couldn’t confirm enough live communities directly in **${locationLabel || "your requested area"}** yet.\n\n` +
      "Try one of these:\n" +
      "- keep the same care type, but widen the area to a nearby city or metro\n" +
      "- double-check the ZIP code and state\n" +
      "- increase the distance radius a bit and ask me to search again\n"
    );
  }

  return (
    "\n\n---\n**Your matches**\n" +
    "_I couldn’t load live suggestions just now. Please try again in a moment._"
  );
};

/**
 * POST /api/chat
 * Body: { messages: { role: "user"|"assistant", content: string }[] }
 */
export const sendChat = catchAsyncError(async (req, res, next) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return next(
      new ErrorHandler(
        "Chat is not configured (missing OPENAI_API_KEY on the server).",
        503
      )
    );
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return next(new ErrorHandler("messages array is required", 400));
  }

  const extractionSystemBase =
    process.env.CAREMATCH_CHAT_SYSTEM_PROMPT?.trim() || DEFAULT_CHAT_SYSTEM_PROMPT;

  const sanitized = messages
    .filter(
      (m) =>
        m &&
        typeof m.content === "string" &&
        (m.role === "user" || m.role === "assistant")
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 12000),
    }))
    .slice(-30);

  if (sanitized.length === 0) {
    return next(new ErrorHandler("No valid messages to send", 400));
  }

  const userMessages = sanitized.filter((m) => m.role === "user");
  const userMessageCount = userMessages.length;
  const latestUserText = userMessages.at(-1)?.content || "";

  const inferredBudget = inferBudgetFromMessages(sanitized);
  const inferredBudgetRange = inferBudgetRangeFromMessages(sanitized);
  const inferredCareLevels = inferCareLevelsFromMessages(sanitized);
  const inferredPrimaryCareType = inferPrimaryCareTypeFromMessages(sanitized);
  const inferredLocation = inferLocationFromMessages(sanitized);
  const inferredZipCode = inferZipCodeFromMessages(sanitized);
  const inferredMaxDistance = inferMaxDistanceFromMessages(sanitized);
  const inferredAmenityMustHaves = inferAmenityMustHavesFromMessages(sanitized);

  const missingEssentials = getMissingMandatoryIntake({
    inferredZipCode,
    inferredBudget,
    inferredBudgetRange,
    inferredMaxDistance,
  });
  const essentialTotalPoints = 3;
  const essentialPointCount = essentialTotalPoints - missingEssentials.length;
  const shouldReturnResults = missingEssentials.length === 0;

  const callOpenAI = async (payload) => {
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
      throw new ErrorHandler(err?.message || "Failed to reach OpenAI", 502);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const rawMsg = String(data?.error?.message || "").trim();
      const isInvalidKey = /incorrect api key|invalid api key|api key/i.test(rawMsg);
      const msg = isInvalidKey
        ? "Carrie is temporarily unavailable due to OpenAI configuration. Please contact support."
        : rawMsg || `OpenAI error (${response.status})`;
      throw new ErrorHandler(msg, response.status >= 500 ? 502 : 400);
    }
    return data;
  };

  if (!shouldReturnResults) {
    const facilities = await Facility.find()
      .select("name care_levels amenities services address pricing")
      .lean();

    const directoryBlock = buildDirectoryContextBlock(facilities);
    const stageRules =
      `CONVERSATION_RULES (server):\n` +
      `- User messages so far: ${userMessageCount}.\n` +
      `- Collected mandatory intake points: ${essentialPointCount}/${essentialTotalPoints} (ZIP, budget, radius).\n` +
      `- Inferred primary care type: ${inferredPrimaryCareType || "NOT YET KNOWN"}.\n` +
      `- Inferred city/region: ${inferredLocation || "NOT YET KNOWN"}.\n` +
      `- Inferred ZIP: ${inferredZipCode || "NOT YET KNOWN"}.\n` +
      `- Inferred budget: ${
        hasInferredBudget(inferredBudget, inferredBudgetRange)
          ? inferredBudgetRange?.max != null
            ? `$${inferredBudgetRange.min ?? "?"}–$${inferredBudgetRange.max}/mo`
            : `$${inferredBudget}/mo`
          : "NOT YET KNOWN"
      }.\n` +
      `- Inferred search radius: ${
        inferredMaxDistance != null ? `${inferredMaxDistance} miles` : "NOT YET KNOWN"
      }.\n` +
      `- Missing mandatory fields (if any): ${missingEssentials.length ? missingEssentials.join(", ") : "none"}.\n` +
      `- PRIORITY ORDER for questions: (1) 5-digit ZIP code → (2) monthly budget → (3) search radius in miles. City/state is helpful context but does **not** replace ZIP.\n` +
      `- CRITICAL: We support assisted living only. Never ask for or suggest any other care type.\n` +
      `- Do **not** output ---CAREMATCH_INTAKE_JSON--- ... ---END--- until **ZIP code, monthly budget, and search radius (miles)** are all known from the user.\n` +
      `- If you are not outputting that JSON block yet, **do not** include those delimiters at all.\n` +
      `- Keep replies feeling human; one gentle question max when you need info.\n` +
      `- If mandatory fields are missing, ask ONLY about the **highest-priority** missing field from the list above.\n` +
      `- If the user asks for matches before mandatory fields are complete, warmly explain you need ZIP, budget, and radius first, then ask for the highest-priority missing one.\n` +
      `- For radius, ask how many **miles** from the ZIP they want to search (e.g. 10, 25, 50). Accept answers like "25 miles" or just "25" if you just asked for miles.\n` +
      `- If all mandatory fields are present, do not ask more intake questions; the server will run matching.`;

    const conversationSystem =
      process.env.CAREMATCH_CHAT_SYSTEM_PROMPT?.trim() ||
      `${CAREMATCH_CONVERSATION_SYSTEM_PROMPT}\n\n${directoryBlock}\n\n${stageRules}`;

    const payload = {
      model: OPENAI_CHAT_MODEL,
      messages: [{ role: "system", content: conversationSystem }, ...sanitized],
      max_tokens: 700,
      temperature: 0.88,
    };

    let data;
    try {
      data = await callOpenAI(payload);
    } catch (err) {
      return next(err);
    }

    let text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return next(new ErrorHandler("Empty response from model", 502));
    }

    const { userVisible, prefs: rawPrefs } = extractIntakeJsonBlock(text);
    const jsonForbidden = rawPrefs != null && missingEssentials.length > 0;

    let out = (userVisible || text).trim();
    if (jsonForbidden && rawPrefs) {
      const stillNeed = missingEssentials.join(", ");
      out = `${out}\n\n_(I need your ${stillNeed} before I can search for communities.)_`.trim();
    }

    return res.status(200).json({
      success: true,
      message: {
        role: "assistant",
        content: sanitizeCarrieChatText(out),
      },
    });
  }

  const extractionPayload = {
    model: OPENAI_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          `${extractionSystemBase}\n\nExtract best-effort intake JSON from this conversation and output ONLY the CAREMATCH JSON block. Do not ask questions.\n\nCRITICAL RULES FOR JSON EXTRACTION:\n1. searchLocation MUST ONLY contain geographic names (City, State, ZIP). NEVER include budget phrases (e.g. "under 1000", "for under"), care types, distance/radius phrases (e.g. "under 20 miles", "within 15 miles"), or sentence fragments. Correct typos (e.g. "arizonaa" → "Arizona", "taxes" → "Texas", "caa" → "CA"). Format as "City, ST".\n2. primaryCareType and careLevels must always be set to assisted living only.\n3. amenityMustHaves should be concise normalized phrases (e.g. "wheelchair accessible", "private room"), not raw sentences. Include requested details like meals, activities, physical therapy, hospice care, wheelchair-accessible entrance/parking, room types, staff qualifications, reviews, safety standards, and modern amenities when mentioned.\n4. **searchZipCode**, **budgetMaxMonthly** (or a min/max range), and **maxDistanceMiles** are REQUIRED — use null only if truly absent from the thread (the server will not run matching until all three are provided).\n5. If the user specifies distance/radius like "within 20 miles", "25 mi", or answers a miles question with a bare number (e.g. "25"), set maxDistanceMiles to that number.\n6. All fields must be valid JSON. Use null for unknown optional numbers, [] for unknown arrays.\n7. If the user gives a budget RANGE (e.g. "$10,000 to $12,000", "between 10k and 12k", "$10,000-$12,000"), set budgetMinMonthly to the lower number and budgetMaxMonthly to the higher number. If they only say "under X" or "up to X", set budgetMaxMonthly to X and leave budgetMinMonthly as null.`,
      },
      { role: "user", content: JSON.stringify({ messages: sanitized }) },
    ],
    max_tokens: 700,
    temperature: 0.1,
  };

  let data;
  try {
    data = await callOpenAI(extractionPayload);
  } catch (err) {
    return next(err);
  }

  let text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return next(new ErrorHandler("Empty response from model", 502));
  }

  let { userVisible, prefs: rawPrefs } = extractIntakeJsonBlock(text);
  let finalContent = userVisible || text;

  if (!rawPrefs) {
    rawPrefs = {};
    finalContent =
      "I’ve collected enough from our chat, so I’m now showing best-fit facilities from your details.";
  }

  if (rawPrefs && inferredBudgetRange?.min != null) {
    rawPrefs.budgetMinMonthly = inferredBudgetRange.min;
  }
  if (rawPrefs && inferredBudgetRange?.max != null) {
    rawPrefs.budgetMaxMonthly = inferredBudgetRange.max;
  }
  console.log("[sendChat] budget patch:", { inferredBudgetRange, rawMin: rawPrefs?.budgetMinMonthly, rawMax: rawPrefs?.budgetMaxMonthly });

  let matchedFacilities = null;
  let matchedPreferences = null;
  if (rawPrefs) {
    const prefs = normalizeIntakePreferences(rawPrefs);

    // Enforce assisted-living-only mode.
    if (prefs) {
      prefs.primaryCareType = ASSISTED_ONLY_CARE_LEVEL;
      prefs.careLevels = [ASSISTED_ONLY_CARE_LEVEL];
      prefs.snfReadiness = false;
    }

    // Backfill ZIP code
    if (prefs && !prefs.searchZipCode && inferredZipCode) {
      prefs.searchZipCode = inferredZipCode;
    }

    if (
      prefs &&
      (prefs.budgetMaxMonthly == null || prefs.budgetMaxMonthly <= 0) &&
      inferredBudget
    ) {
      prefs.budgetMaxMonthly = inferredBudget;
    }
    if (prefs && inferredBudgetRange?.min != null) {
      prefs.budgetMinMonthly = inferredBudgetRange.min;
    }
    if (prefs && inferredBudgetRange?.max != null) {
      prefs.budgetMaxMonthly = inferredBudgetRange.max;
    }
    if (
      prefs &&
      (!prefs.searchLocation || prefs.searchLocation.trim().length < 3) &&
      inferredLocation
    ) {
      prefs.searchLocation = inferredLocation;
    }
    if (
      prefs &&
      (prefs.maxDistanceMiles == null || Number.isNaN(Number(prefs.maxDistanceMiles))) &&
      inferredMaxDistance != null
    ) {
      prefs.maxDistanceMiles = inferredMaxDistance;
    }

    const missingAfterBackfill = getMissingMandatoryIntake({
      inferredZipCode:
        String(prefs?.searchZipCode || "")
          .replace(/\D/g, "")
          .slice(0, 5) || inferredZipCode,
      inferredBudget: prefs?.budgetMaxMonthly ?? inferredBudget,
      inferredBudgetRange,
      inferredMaxDistance: prefs?.maxDistanceMiles ?? inferredMaxDistance,
    });
    if (missingAfterBackfill.length > 0) {
      const stillNeed = missingAfterBackfill.join(", ");
      return res.status(200).json({
        success: true,
        message: {
          role: "assistant",
          content: sanitizeCarrieChatText(
            `I’m almost ready to search — I still need your **${stillNeed}** before I can show assisted living communities. What would you like to use?`
          ),
        },
      });
    }
    if (prefs && inferredAmenityMustHaves.length > 0) {
      const existing = Array.isArray(prefs.amenityMustHaves)
        ? prefs.amenityMustHaves.map((x) => String(x).trim()).filter(Boolean)
        : [];
      prefs.amenityMustHaves = [...new Set([...existing, ...inferredAmenityMustHaves])];
    }
    if (prefs && !prefs.personalityNotes && latestUserText.trim()) {
      prefs.personalityNotes = latestUserText.trim().slice(0, 1000);
    }
    // Safety net: normalize searchLocation to Title Case regardless of how user typed it
    // e.g. "arizona" → "Arizona", "los angeles, ca" → "Los Angeles, Ca"
    if (prefs && prefs.searchLocation) {
      // Clean up common budget/care fragments that might leak into location
      let loc = prefs.searchLocation
        .replace(/\b(for|under|over|around|about|budget|max|min|monthly|month|matches|show|me)\b/gi, "")
        .replace(/[\$\d,]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
      
      // If cleaning left us empty but we have a ZIP, keep it empty for ZIP priority
      // otherwise restore original if cleaning was too aggressive (unlikely)
      if (!loc && prefs.searchLocation.length > 2) {
         loc = prefs.searchLocation;
      }

      prefs.searchLocation = loc
        .split(/(\s+|,)/)
        .map((part) => {
          const p = part.trim();
          if (!p) return part;
          if (p === ",") return part;
          if (p.length === 2) return p.toUpperCase(); // Assume state code
          return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
        })
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    }
    const aiParams = intakePreferencesToAiSearchParams(prefs);
    let aiMatchRows = [];
    let aiMatchError = null;
    if (aiParams) {
      try {
        const aiOut = await getCareMatchResults(aiParams);
        aiMatchRows = (aiOut.results || []).map((row, idx) =>
          mapAiDiscoveryFacilityToMatchRow(row, idx)
        );
        if (aiMatchRows.length > 0 && prefs) {
          const searchZip =
            String(prefs.searchZipCode || "")
              .replace(/\D/g, "")
              .slice(0, 5) ||
            String(prefs.searchLocation || "").match(/\b(\d{5})\b/)?.[1] ||
            "";
          aiMatchRows = await enrichDiscoveryFacilitiesWithPersonalizedScores(
            aiMatchRows,
            {
              searchZip,
              locationText: String(prefs.searchLocation || "").trim(),
              maxDistanceMiles: prefs.maxDistanceMiles ?? null,
              careLevels: prefs.careLevels || [],
              seedLat: null,
              seedLng: null,
              budgetMinMonthly: prefs.budgetMinMonthly ?? null,
              budgetMaxMonthly: prefs.budgetMaxMonthly ?? null,
            },
            undefined
          );
        }
      } catch (err) {
        aiMatchError = err;
        console.error("[sendChat] AI discovery search failed:", err?.message || err);
      }
    }

    let finalMatchRows = aiMatchRows;
    let fallbackRuleBasedSection = "";
    if (finalMatchRows.length === 0) {
      try {
        const localFacilities = await Facility.find()
          .select(
            "name address pricing care_levels website specialty description source_platform is_external amenities services external_data images"
          )
          .lean();
        const fallbackRows = rankFacilities(localFacilities, prefs, { limit: 6 });
        if (fallbackRows.length > 0) {
          finalMatchRows = fallbackRows;
          fallbackRuleBasedSection = formatRecommendationsForChat(localFacilities, prefs);
        }
      } catch (err) {
        console.error("[sendChat] Rule-based fallback failed:", err?.message || err);
      }
    }

    const matchSection = finalMatchRows.length > 0
      ? aiMatchRows.length > 0
        ? formatAiDiscoveryMatchesForChat(aiMatchRows, 6)
        : fallbackRuleBasedSection
      : aiMatchError
        ? buildFriendlyDiscoveryFailureMessage(aiMatchError, aiParams)
      : aiParams
        ? "\n\n---\n**Your matches**\n_I couldn’t load live suggestions just now. Try again in a moment._"
        : "\n\n---\n**Your matches**\n_Add a **ZIP code** with your city or state (for example, “Boston, MA 02108”) so I can run live discovery._";

    finalContent = `Here's what I pulled together from our conversation — your best-fit communities are below.${matchSection}`;
    if (prefs) {
      // Keep budget aliases for client compatibility across flows.
      prefs.budgetMin = prefs.budgetMinMonthly;
      prefs.budgetMax = prefs.budgetMaxMonthly;
      prefs.budget_min = prefs.budgetMinMonthly;
      prefs.budget_max = prefs.budgetMaxMonthly;
      matchedFacilities = finalMatchRows;
      matchedPreferences = prefs;
    }
  }

  res.status(200).json({
    success: true,
    message: {
      role: "assistant",
      content: sanitizeCarrieChatText(finalContent),
    },
    ...(matchedFacilities != null && { matchedFacilities }),
    ...(matchedPreferences != null && { matchedPreferences }),
  });
});

/**
 * POST /api/chat/transcribe
 * multipart/form-data: { file: audio/* }
 */
export const transcribeAudio = catchAsyncError(async (req, res, next) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return next(
      new ErrorHandler(
        "Transcription is not configured (missing OPENAI_API_KEY on the server).",
        503
      )
    );
  }

  const file = req.file;
  if (!file || !file.buffer || file.size <= 0) {
    return next(new ErrorHandler("Audio file is required.", 400));
  }

  const formData = new FormData();
  const blob = new Blob([file.buffer], {
    type: file.mimetype || "audio/webm",
  });
  formData.append("file", blob, file.originalname || "voice-input.webm");
  formData.append("model", "gpt-4o-mini-transcribe");

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });
  } catch (err) {
    return next(
      new ErrorHandler(err?.message || "Failed to reach OpenAI transcription API.", 502)
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawMsg = String(data?.error?.message || "").trim();
    const isInvalidKey = /incorrect api key|invalid api key|api key/i.test(rawMsg);
    const msg = isInvalidKey
      ? "Transcription is temporarily unavailable due to OpenAI configuration."
      : rawMsg || `OpenAI transcription error (${response.status})`;
    return next(new ErrorHandler(msg, response.status >= 500 ? 502 : 400));
  }

  const transcript = String(data?.text || "").trim();
  res.status(200).json({
    success: true,
    text: transcript,
  });
});
