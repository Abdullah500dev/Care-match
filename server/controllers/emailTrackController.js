import catchAsyncError from "../middleware/catchAsyncErrors.js";
import EmailTrack from "../models/emailTrackModel.js";
import Lead from "../models/leadModel.js";
import User from "../models/userModel.js";

/** 1×1 transparent GIF */
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

const markLeadOpened = async (leadId) => {
  if (!leadId) return;
  const now = new Date();
  const lead = await Lead.findById(leadId);
  if (!lead || lead.isRemoved) return;

  lead.emailOpenCount = (lead.emailOpenCount || 0) + 1;
  if (!lead.emailOpened) {
    lead.emailOpened = true;
    lead.emailOpenedAt = now;
    console.log(
      `[email-track] lead visible user=${lead.userEmail} facility="${lead.facilityName}"`,
    );
  }
  // Opening the notify email advances status from New → Email Opened
  // (do not overwrite later pipeline statuses).
  if (lead.status === "New") {
    lead.status = "Email Opened";
  }
  await lead.save();
};

const recordOpen = async (token) => {
  if (!token) return null;
  const now = new Date();
  const track = await EmailTrack.findOne({ token });
  if (!track) return null;

  track.openCount = (track.openCount || 0) + 1;
  if (!track.firstOpenedAt) track.firstOpenedAt = now;
  track.lastOpenedAt = now;
  await track.save();

  await markLeadOpened(track.leadId);

  console.log(
    `[email-track] opened type=${track.type} recipient=${track.recipientEmail} facility="${track.facilityName}" opens=${track.openCount}`,
  );
  return track;
};

const sendPixel = (res) => {
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": String(TRANSPARENT_GIF.length),
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  return res.status(200).end(TRANSPARENT_GIF);
};

const wantsHtml = (req) => {
  const accept = String(req.headers.accept || "").toLowerCase();
  // Image requests / Gmail proxy usually ask for image/* or */*
  if (/\.gif$/i.test(String(req.params.token || ""))) return false;
  if (accept.includes("text/html")) return true;
  if (String(req.query.view || "") === "1") return true;
  return false;
};

/**
 * Public tracking pixel / open confirmation.
 * GET /api/email/track/:token   (optional .gif suffix)
 * GET /api/email/track/:token?view=1  → HTML confirmation (tap link in email)
 */
export const trackEmailOpen = catchAsyncError(async (req, res) => {
  const raw = String(req.params.token || "").trim();
  const token = raw.replace(/\.gif$/i, "");

  const track = await recordOpen(token);

  if (wantsHtml(req)) {
    const opened = Boolean(track);
    res.set("Cache-Control", "no-store");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Open recorded</title>
<style>
  body{font-family:Arial,sans-serif;background:#f4f6f8;color:#1f2937;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;max-width:420px;text-align:center}
  h1{font-size:20px;margin:0 0 8px} p{margin:0;color:#6b7280;font-size:14px;line-height:1.5}
</style></head><body><div class="card">
  <h1>${opened ? "Open recorded" : "Link not found"}</h1>
  <p>${
    opened
      ? "Thanks — we logged that this email was opened."
      : "This tracking link is invalid or expired."
  }</p>
</div></body></html>`);
  }

  return sendPixel(res);
});

/**
 * Admin: list explore-click email open events.
 * GET /api/email/explore-opens
 */
export const listExploreEmailOpens = catchAsyncError(async (req, res) => {
  const dbUser = await User.findById(req.user?.id).select("role user_type");
  if (!dbUser || (dbUser.role !== "admin" && dbUser.user_type !== "admin")) {
    return res.status(403).json({ success: false, message: "Admin only" });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const events = await EmailTrack.find({ type: "explore_click" })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return res.status(200).json({
    success: true,
    count: events.length,
    events: events.map((e) => ({
      id: e._id,
      recipientEmail: e.recipientEmail,
      userName: e.userName,
      userEmail: e.userEmail,
      facilityName: e.facilityName,
      facilityId: e.facilityId,
      destinationUrl: e.destinationUrl,
      openCount: e.openCount || 0,
      opened: Boolean(e.firstOpenedAt),
      firstOpenedAt: e.firstOpenedAt,
      lastOpenedAt: e.lastOpenedAt,
      sentAt: e.createdAt,
    })),
  });
});
