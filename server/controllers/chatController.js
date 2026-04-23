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
  rankAllFacilities,
} from "../services/matchingEngine.js";

const PRELUDE_MAX_USER_MESSAGES = 2;
const QUESTION_COUNT = 5;

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

const inferBudgetFromMessages = (msgs) => {
  const users = msgs.filter((m) => m.role === "user").map((m) => m.content || "");
  for (let i = users.length - 1; i >= 0; i -= 1) {
    const text = String(users[i]);
    if (!/budget|month|monthly|\/mo|\$|cost|price|afford|under/i.test(text)) continue;
    const parsed = parseBudgetLikeValue(text);
    if (parsed != null && parsed > 0) return parsed;
  }
  return null;
};

const inferCareLevelsFromMessages = (msgs) => {
  const text = msgs
    .filter((m) => m.role === "user")
    .map((m) => String(m.content || ""))
    .join(" \n ")
    .toLowerCase();
  const levels = new Set();
  if (/\bskilled nursing|snf|nursing home|subacute\b/i.test(text)) levels.add("skilled nursing");
  if (/\bmemory care|dementia|alzheimer\b/i.test(text)) levels.add("memory care");
  if (/\bassisted living|assisted\b/i.test(text)) levels.add("assisted living");
  if (/\bindependent living|independent\b/i.test(text)) levels.add("independent living");
  if (/\brespite\b/i.test(text)) levels.add("respite");
  if (/\bhospice\b/i.test(text)) levels.add("hospice");
  return [...levels];
};

/**
 * Infer the PRIMARY care type (hard filter) from messages.
 * Priority: Skilled Nursing > Memory Care > Assisted Living > Independent Living > Respite > Hospice
 * Returns a single string or null.
 */
const inferPrimaryCareTypeFromMessages = (msgs) => {
  const text = msgs
    .filter((m) => m.role === "user")
    .map((m) => String(m.content || ""))
    .join(" \n ");
  if (/\bskilled nursing|\bsnf\b|nursing home|subacute/i.test(text)) return "skilled nursing";
  if (/\bmemory care|dementia|alzheimer/i.test(text)) return "memory care";
  if (/\bassisted living/i.test(text)) return "assisted living";
  if (/\bindependent living/i.test(text)) return "independent living";
  if (/\brespite/i.test(text)) return "respite";
  if (/\bhospice/i.test(text)) return "hospice";
  return null;
};

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

const inferMaxDistanceFromMessages = (msgs) => {
  const users = msgs.filter((m) => m.role === "user").map((m) => String(m.content || ""));
  for (let i = users.length - 1; i >= 0; i -= 1) {
    const text = users[i].toLowerCase();
    const milesPattern =
      /\b(?:within|up to|no more than|under|around|about|at most)?\s*(\d{1,3})(?:\s*-\s*\d{1,3})?\s*(?:mile|miles|mi)\b/;
    const m = text.match(milesPattern);
    if (m?.[1]) {
      const value = Number.parseInt(m[1], 10);
      if (!Number.isNaN(value) && value > 0) return value;
    }
  }
  return null;
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

  const fullThreadText = sanitized.map((m) => m.content).join("\n");
  const hasMatchIntent =
    /\b(match|recommend|recommendation|rank|best fit|find|looking for|need|help me find|facility near|near me)\b/i.test(
      fullThreadText
    );
  const explicitMatchNow =
    /\b(show|give|get)\s+(me\s+|my\s+|our\s+)?(?:best\s+|top\s+|ranked\s+)?(matches|results|rankings?|recommendations?)\b/i.test(
      latestUserText
    ) ||
    /\b(show|give|get).{0,60}\b(matches|results|rankings?|recommendations?)\b/i.test(
      latestUserText
    );

  const preludeUsed = hasMatchIntent ? 0 : Math.min(PRELUDE_MAX_USER_MESSAGES, userMessageCount);
  const intakeAnswerCount = Math.max(0, userMessageCount - preludeUsed);
  const inferredBudget = inferBudgetFromMessages(sanitized);
  const inferredCareLevels = inferCareLevelsFromMessages(sanitized);
  const inferredPrimaryCareType = inferPrimaryCareTypeFromMessages(sanitized);
  const inferredLocation = inferLocationFromMessages(sanitized);
  const inferredZipCode = inferZipCodeFromMessages(sanitized);
  const inferredMaxDistance = inferMaxDistanceFromMessages(sanitized);

  // Priority-ordered missing essentials:
  // 1. Care Type (hard filter) — most critical
  // 2. Location (city/state or ZIP)
  // 3. Budget
  // 4. Amenities (not tracked here, handled by GPT)
  // 5. Care level sub-needs (lower priority)
  const missingEssentials = [
    ...(inferredPrimaryCareType ? [] : ["care type (assisted living, skilled nursing, memory care, etc.)"]),
    ...((inferredLocation || inferredZipCode) ? [] : ["location (city/state or ZIP code)"]),
    ...(inferredBudget ? [] : ["approximate monthly budget"]),
  ];
  // We need care type + location at minimum to show results
  const essentialTotalPoints = 3; // care type + location + budget
  const essentialPointCount = essentialTotalPoints - missingEssentials.length;
  const shouldReturnResults =
    explicitMatchNow ||
    essentialPointCount >= essentialTotalPoints ||
    intakeAnswerCount >= QUESTION_COUNT;

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
    const minMessagesBeforeJson = preludeUsed + QUESTION_COUNT + 1;

    const stageRules =
      `CONVERSATION_RULES (server):\n` +
      `- User messages so far: ${userMessageCount}.\n` +
      `- Collected essential intake points: ${essentialPointCount}/${essentialTotalPoints}.\n` +
      `- Inferred primary care type: ${inferredPrimaryCareType || "NOT YET KNOWN"}.\n` +
      `- Inferred location: ${inferredLocation || inferredZipCode || "NOT YET KNOWN"}.\n` +
      `- Inferred budget: ${inferredBudget ? `$${inferredBudget}/mo` : "NOT YET KNOWN"}.\n` +
      `- Missing essentials (if any): ${missingEssentials.length ? missingEssentials.join(", ") : "none"}.\n` +
      `- PRIORITY ORDER for questions: (1) Care Type → (2) Location + ZIP → (3) Budget → (4) Amenities → (5) Care Level sub-needs.\n` +
      `- CRITICAL: If care type is known, NEVER ask about or suggest the opposite type (e.g., if user said assisted living, never mention skilled nursing).\n` +
      `- Do **not** output ---CAREMATCH_INTAKE_JSON--- ... ---END--- until the user has sent **at least ${minMessagesBeforeJson}** messages, **unless** they clearly insist on seeing matches right now and you can honestly fill the JSON from the thread.\n` +
      `- If you are not outputting that JSON block yet, **do not** include those delimiters at all.\n` +
      `- Keep replies feeling human; one gentle question max when you need info.\n` +
      `- If essentials are missing, ask ONLY about the HIGHEST PRIORITY missing essential from the priority list above.\n` +
      `- If location (city/state) is known but ZIP is not, ask once: "Do you have a ZIP code? That helps narrow results to your exact area.".\n` +
      `- If essentials are all present, do not ask more intake questions; proceed to show matches.`;

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
    const jsonForbidden =
      !explicitMatchNow && userMessageCount < minMessagesBeforeJson && rawPrefs != null;

    let out = jsonForbidden ? (userVisible || text).trim() : (userVisible || text).trim();
    if (jsonForbidden && rawPrefs) {
      out = `${out}\n\n_(I’m not running the matcher yet — tell me a bit more when you’re ready.)_`.trim();
    }

    return res.status(200).json({
      success: true,
      message: {
        role: "assistant",
        content: out,
      },
    });
  }

  const extractionPayload = {
    model: OPENAI_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          `${extractionSystemBase}\n\nExtract best-effort intake JSON from this conversation and output ONLY the CAREMATCH JSON block. Do not ask questions.\n\nCRITICAL RULES FOR JSON EXTRACTION:\n1. searchLocation MUST ONLY contain geographic names (City, State, ZIP). NEVER include budget phrases (e.g. "under 1000", "for under"), care types, or sentence fragments. Correct typos (e.g. "arizonaa" → "Arizona", "taxes" → "Texas", "caa" → "CA"). Format as "City, ST".\n2. careLevels must be lowercase standard terms: "assisted living", "memory care", "independent living", "skilled nursing".\n3. amenityMustHaves should be concise normalized phrases (e.g. "wheelchair accessible", "private room"), not raw sentences.\n4. All fields must be valid JSON. Use null for unknown numbers, [] for unknown arrays.`,
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

  let matchedFacilities = null;
  let matchedPreferences = null;
  if (rawPrefs) {
    const prefs = normalizeIntakePreferences(rawPrefs);

    // Backfill primaryCareType from inference if GPT didn't extract it
    if (prefs && !prefs.primaryCareType && inferredPrimaryCareType) {
      prefs.primaryCareType = inferredPrimaryCareType;
    }
    // Ensure careLevels is consistent with primaryCareType
    if (prefs && prefs.primaryCareType && (!prefs.careLevels || prefs.careLevels.length === 0)) {
      prefs.careLevels = [prefs.primaryCareType];
    }

    // Backfill ZIP code
    if (prefs && !prefs.searchZipCode && inferredZipCode) {
      prefs.searchZipCode = inferredZipCode;
    }

    if (prefs && (prefs.budgetMaxMonthly == null || prefs.budgetMaxMonthly <= 0) && inferredBudget) {
      prefs.budgetMaxMonthly = inferredBudget;
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
    const facilities = await Facility.find().lean();
    const matchSection = formatRecommendationsForChat(facilities, prefs);
    finalContent = `Here's what I pulled together from our conversation — your best-fit communities are below.${matchSection}`;
    if (prefs) {
      matchedFacilities = rankAllFacilities(facilities, prefs);
      matchedPreferences = prefs;
    }
  }

  res.status(200).json({
    success: true,
    message: {
      role: "assistant",
      content: finalContent.trim(),
    },
    ...(matchedFacilities != null && { matchedFacilities }),
    ...(matchedPreferences != null && { matchedPreferences }),
  });
});
