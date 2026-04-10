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
} from "../services/matchingEngine.js";

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

  const payload = {
    model: OPENAI_CHAT_MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...sanitized],
    max_tokens: 1400,
    temperature: 0.82,
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
    return next(
      new ErrorHandler(
        err?.message || "Failed to reach OpenAI",
        502
      )
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg =
      data?.error?.message ||
      `OpenAI error (${response.status})`;
    return next(new ErrorHandler(msg, response.status >= 500 ? 502 : 400));
  }

  let text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return next(new ErrorHandler("Empty response from model", 502));
  }

  const { userVisible, prefs: rawPrefs } = extractIntakeJsonBlock(text);
  let finalContent = userVisible || text;

  if (rawPrefs) {
    const prefs = normalizeIntakePreferences(rawPrefs);
    const facilities = await Facility.find().lean();
    const matchSection = formatRecommendationsForChat(facilities, prefs);
    finalContent = (userVisible || "").trim() + matchSection;
    if (!userVisible?.trim()) {
      finalContent = `Here are communities ranked from our directory using your answers:${matchSection}`;
    }
  }

  res.status(200).json({
    success: true,
    message: {
      role: "assistant",
      content: finalContent.trim(),
    },
  });
});
