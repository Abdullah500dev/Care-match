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
  lead.confirmedOpen = true;
  if (!lead.emailOpened) {
    lead.emailOpened = true;
    lead.emailOpenedAt = now;
  }
  if (lead.status === "New") {
    lead.status = "Email Opened";
  }
  await lead.save();
  console.log(
    `[email-track] Email Opened user=${lead.userEmail} facility="${lead.facilityName}"`,
  );
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

/**
 * Tracking pixel — when the email loads images, mark lead Email Opened immediately.
 * GET /api/email/track/:token  (optional .gif)
 */
export const trackEmailOpen = catchAsyncError(async (req, res) => {
  const raw = String(req.params.token || "").trim();
  const token = raw.replace(/\.gif$/i, "");

  if (token) {
    const now = new Date();
    const track = await EmailTrack.findOne({ token });
    if (track) {
      track.openCount = (track.openCount || 0) + 1;
      if (!track.firstOpenedAt) track.firstOpenedAt = now;
      track.lastOpenedAt = now;
      await track.save();
      await markLeadOpened(track.leadId);
      console.log(
        `[email-track] opened recipient=${track.recipientEmail} facility="${track.facilityName}" opens=${track.openCount}`,
      );
    }
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
