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
    6
  );
  const sampleNames = facilities
    .slice(0, 12)
    .map((f) => String(f.name || "Community").trim())
    .filter(Boolean);
  return [
    `Total communities: ${count}.`,
    careOptions.length ? `Care types seen in listings: ${careOptions.join(", ")}.` : null,
    areaOptions.length ? `Example areas: ${areaOptions.join(", ")}.` : null,
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
  const explicitMatchNow = /\b(show|give|get)\s+(me\s+)?(my\s+)?(matches|results|rankings?|recommendations?)\b/i.test(
    latestUserText
  );

  const preludeUsed = hasMatchIntent ? 0 : Math.min(PRELUDE_MAX_USER_MESSAGES, userMessageCount);
  const intakeAnswerCount = Math.max(0, userMessageCount - preludeUsed);
  const shouldReturnResults = intakeAnswerCount > QUESTION_COUNT || explicitMatchNow;

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
      const msg = data?.error?.message || `OpenAI error (${response.status})`;
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
      `- Do **not** output ---CAREMATCH_INTAKE_JSON--- ... ---END--- until the user has sent **at least ${minMessagesBeforeJson}** messages, **unless** they clearly insist on seeing matches right now and you can honestly fill the JSON from the thread.\n` +
      `- If you are not outputting that JSON block yet, **do not** include those delimiters at all.\n` +
      `- Keep replies feeling human; one gentle question max when you need info.`;

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
          `${extractionSystemBase}\n\nExtract best-effort intake JSON from this conversation and output ONLY the CAREMATCH JSON block. Do not ask questions.`,
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
    const inferredBudget = inferBudgetFromMessages(sanitized);
    if (prefs && (prefs.budgetMaxMonthly == null || prefs.budgetMaxMonthly <= 0) && inferredBudget) {
      prefs.budgetMaxMonthly = inferredBudget;
    }
    const facilities = await Facility.find().lean();
    const matchSection = formatRecommendationsForChat(facilities, prefs);
    finalContent = `Here’s what I pulled together from our conversation — your best-fit communities are below.${matchSection}`;
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
