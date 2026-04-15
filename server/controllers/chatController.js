import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import {
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

/**
 * POST /api/chat
 * Body: { messages: { role: "user"|"assistant", content: string }[] }
 */
export const sendChat = catchAsyncError(async (req, res, next) => {
  const QUESTION_VARIANTS = [
    [
      "To begin, what level of care are you primarily looking for right now (for example: assisted living, memory care, independent living, or skilled nursing)?",
      "Let’s start with care needs: which care level best fits your situation today?",
      "First, which care type should I prioritize for you—assisted, memory, independent, or skilled nursing?",
    ],
    [
      "Great. Next, what amenities or services are absolute must-haves for you?",
      "Thanks — now tell me your non-negotiables: which amenities/services do you definitely want?",
      "Moving to preferences, which features are must-have items for your shortlist?",
    ],
    [
      "To keep matches realistic, what’s your maximum monthly budget in USD?",
      "What monthly budget ceiling should I use when filtering options?",
      "Could you share your top monthly spend target (USD) so I can stay in range?",
    ],
    [
      "What area should we focus on, and how important are frequent family visits?",
      "Which location/ZIP should I center on, and how often do you expect visitation?",
      "For distance and visits, where do you want to stay near and what visitation pattern matters most?",
    ],
    [
      "Last one: what personality or lifestyle fit do you want (quiet vs social, routines, faith, pets, etc.)?",
      "Final step — describe the day-to-day vibe that fits best: calm, active, social, faith-based, pet-friendly, and so on.",
      "Before I rank matches, what personality/lifestyle environment should I optimize for?",
    ],
  ];

  const pickQuestionVariant = (questionIndex, seedText = "") => {
    const variants = QUESTION_VARIANTS[questionIndex] || [];
    if (variants.length === 0) return "";
    let seed = 0;
    const src = String(seedText || "");
    for (let i = 0; i < src.length; i += 1) seed += src.charCodeAt(i);
    const idx = Math.abs(seed + questionIndex) % variants.length;
    return variants[idx];
  };

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

  const buildQuestionWithOptions = (questionIndex, baseQuestion, facilities) => {
    const lines = [baseQuestion];
    if (!Array.isArray(facilities) || facilities.length === 0) {
      return `${baseQuestion}\n\nOptions: reply in your own words.`;
    }

    if (questionIndex === 0) {
      const careOptions = topValues(
        facilities.flatMap((f) => (Array.isArray(f.care_levels) ? f.care_levels : [])),
        6
      );
      if (careOptions.length) lines.push(`Options from our listings: ${careOptions.join(" | ")}`);
    } else if (questionIndex === 1) {
      const amenityOptions = topValues(
        facilities.flatMap((f) => [
          ...(Array.isArray(f.amenities) ? f.amenities : []),
          ...(Array.isArray(f.services) ? f.services : []),
        ]),
        8
      );
      if (amenityOptions.length) lines.push(`Available options you can pick from: ${amenityOptions.join(" | ")}`);
    } else if (questionIndex === 2) {
      lines.push("Budget examples: under $3,000 | $3,000-$5,000 | $5,000-$7,000 | $7,000-$10,000 | $10,000+");
    } else if (questionIndex === 3) {
      const locationOptions = topValues(facilities.map((f) => toCityHint(f.address)).filter(Boolean), 6);
      if (locationOptions.length) lines.push(`Common areas in our DB: ${locationOptions.join(" | ")}`);
      lines.push("Visitation options: low | medium | high");
    } else if (questionIndex === 4) {
      lines.push("Personality options: quiet/calm | social/active | faith-based | pet-friendly | routine-focused");
    }

    lines.push("You can also type your own preference.");
    return lines.join("\n\n");
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

  const systemPrompt =
    process.env.CAREMATCH_CHAT_SYSTEM_PROMPT?.trim() ||
    DEFAULT_CHAT_SYSTEM_PROMPT;

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

  const userMessageCount = sanitized.filter((m) => m.role === "user").length;
  const QUESTION_COUNT = 5;
  const shouldReturnResults = userMessageCount > QUESTION_COUNT;

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
    const questionIndex = Math.max(0, Math.min(QUESTION_COUNT - 1, userMessageCount - 1));
    const latestUserText =
      sanitized.filter((m) => m.role === "user").at(-1)?.content || "";
    const question = pickQuestionVariant(questionIndex, latestUserText);
    const facilitiesForOptions = await Facility.find()
      .select("care_levels amenities services address")
      .lean();
    const questionWithOptions = buildQuestionWithOptions(
      questionIndex,
      question,
      facilitiesForOptions
    );

    return res.status(200).json({
      success: true,
      message: {
        role: "assistant",
        content: questionWithOptions,
      },
    });
  }

  const extractionPayload = {
    model: OPENAI_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          `${systemPrompt}\n\nExtract best-effort intake JSON from this conversation and output ONLY the CAREMATCH JSON block. Do not ask questions.`,
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
      "I’ve collected your 5 answers, so I’m now showing best-fit facilities from your details.";
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
    finalContent = `Thanks — I now have your care level, amenities, budget, location/visitation, and personality preferences. Here are your best-fit facilities.${matchSection}`;
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
