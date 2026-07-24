import catchAsyncError from "../middleware/catchAsyncErrors.js";
import EmailTrack from "../models/emailTrackModel.js";
import Lead from "../models/leadModel.js";
import User from "../models/userModel.js";

/** 1×1 transparent GIF */
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/**
 * Ignore pixel hits that arrive too soon after send.
 * Gmail/Outlook scanners often fetch images on delivery (false "opens").
 */
const OPEN_GRACE_MS = Math.max(
  15_000,
  Number.parseInt(String(process.env.EMAIL_OPEN_GRACE_MS || "60000"), 10) || 60_000,
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
    `[email-track] email opened user=${lead.userEmail} facility="${lead.facilityName}"`,
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
 * Public tracking pixel.
 * GET /api/email/track/:token  (optional .gif)
 * Lead status becomes Email Opened only after the grace window (real open).
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

      const ageMs = now.getTime() - new Date(track.createdAt).getTime();
      // Ignore instant delivery scanners; count real opens after grace,
      // or a 2nd hit (prefetch + later view) once a short delay has passed.
      const afterGrace = ageMs >= OPEN_GRACE_MS;
      const secondHitLater = track.openCount >= 2 && ageMs >= 20_000;

      if (afterGrace || secondHitLater) {
        await markLeadOpened(track.leadId);
        console.log(
          `[email-track] opened recipient=${track.recipientEmail} facility="${track.facilityName}" opens=${track.openCount}`,
        );
      } else {
        console.log(
          `[email-track] early pixel ignored (${Math.round(ageMs / 1000)}s, hits=${track.openCount}) facility="${track.facilityName}"`,
        );
      }
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
