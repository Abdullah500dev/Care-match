import crypto from "crypto";

import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendMail from "../utils/sendMail.js";
import { resolveEmailTrackingBaseUrl } from "../utils/resolveApiBaseUrl.js";
import User from "../models/userModel.js";
import EmailTrack from "../models/emailTrackModel.js";
import Lead from "../models/leadModel.js";

const DEFAULT_NOTIFY_EMAILS = [
  "abdullah.bugmonks@gmail.com",
  "abdullah400dev@gmail.com",
];

const isLocalHostUrl = (value) => {
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
};

const parseNotifyEmails = () => {
  const raw = String(process.env.EXPLORE_NOTIFY_EMAILS || "").trim();
  if (!raw) return DEFAULT_NOTIFY_EMAILS;
  return [
    ...new Set(
      raw
        .split(/[,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
};

/**
 * Notify admins when a logged-in user clicks Explore on a facility card.
 * Also creates a Lead (shown in admin Leads after the notify email is opened).
 * POST /api/facilities/explore-click
 */
export const notifyExploreClick = catchAsyncError(async (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return next(new ErrorHandler("Please login to access this resource", 400));
  }

  const user = await User.findById(userId).select("name email");
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const {
    facilityId = "",
    facilityName = "",
    name = "",
    address = "",
    zipCode = "",
    phone = "",
    website = "",
    destinationUrl = "",
    sourcePlatform = "",
    careType = "",
    category = "",
  } = req.body || {};

  const resolvedName = String(facilityName || name || "").trim() || "Unknown facility";
  const resolvedDestination = String(destinationUrl || website || "").trim();
  const resolvedCareType = String(careType || category || "").trim();
  const recipients = parseNotifyEmails();

  if (recipients.length === 0) {
    return res.status(200).json({ success: true, sent: 0, message: "No notify emails configured" });
  }

  const lead = await Lead.create({
    userId: user._id,
    userName: user.name || "",
    userEmail: user.email || "",
    facilityId: String(facilityId || "").trim(),
    facilityName: resolvedName,
    careType: resolvedCareType,
    destinationUrl: resolvedDestination,
    sourcePlatform: String(sourcePlatform || "").trim(),
    status: "New",
    emailOpened: false,
  });

  const apiBase = resolveEmailTrackingBaseUrl(req);
  if (isLocalHostUrl(apiBase)) {
    console.warn(
      `[explore-click] WARNING: tracking URL is local (${apiBase}). Opens from mobile/Gmail will NOT hit this server. Set EMAIL_TRACKING_BASE_URL to a public HTTPS URL (ngrok or production).`,
    );
  }

  const sentAt = new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";

  const results = await Promise.allSettled(
    recipients.map(async (recipientEmail) => {
      const token = crypto.randomBytes(24).toString("hex");
      await EmailTrack.create({
        token,
        type: "explore_click",
        recipientEmail,
        userId: user._id,
        userName: user.name || "",
        userEmail: user.email || "",
        facilityId: String(facilityId || "").trim(),
        facilityName: resolvedName,
        destinationUrl: resolvedDestination,
        leadId: lead._id,
      });

      const trackingPixelUrl = `${apiBase}/api/email/track/${token}.gif`;

      console.log(
        `[explore-click] sending to ${recipientEmail} track=${trackingPixelUrl}`,
      );

      await sendMail({
        email: recipientEmail,
        subject: `Explore click: ${resolvedName}`,
        template: "explore-click.ejs",
        data: {
          userName: user.name || "User",
          userEmail: user.email || "",
          facilityName: resolvedName,
          facilityId: String(facilityId || "").trim(),
          address: String(address || "").trim(),
          zipCode: String(zipCode || "").trim(),
          phone: String(phone || "").trim(),
          website: String(website || "").trim(),
          destinationUrl: resolvedDestination,
          sourcePlatform: String(sourcePlatform || "").trim(),
          careType: resolvedCareType,
          sentAt,
          trackingPixelUrl,
        },
      });

      return recipientEmail;
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results
    .filter((r) => r.status === "rejected")
    .map((r) => r.reason?.message || "send failed");

  if (failed.length) {
    console.error("[explore-click] some emails failed:", failed);
  }

  return res.status(200).json({
    success: true,
    sent,
    failed: failed.length,
    leadId: lead._id,
  });
});
