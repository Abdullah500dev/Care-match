import crypto from "crypto";

import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendMail from "../utils/sendMail.js";
import { resolveEmailTrackingBaseUrl } from "../utils/resolveApiBaseUrl.js";
import { resolveClientBaseUrl } from "../utils/resolveClientBaseUrl.js";
import User from "../models/userModel.js";
import EmailTrack from "../models/emailTrackModel.js";
import Lead from "../models/leadModel.js";
import Facility from "../models/facilityModel.js";
import mongoose from "mongoose";

const DEFAULT_ADMIN_EMAIL = "usman.anwar@myzing.io";

const isLocalHostUrl = (value) => {
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
};

const cleanFacilityField = (value) => {
  const s = String(value || "").trim();
  if (!s || /^n\/?a$/i.test(s) || s === "—" || s === "-") return "";
  return s;
};

const isPlaceholderFacilityEmail = (value) =>
  /@external\.carematch\.local$/i.test(String(value || "").trim());

const resolveExploreRecipients = (facilityEmail = "") => {
  const adminEmail = String(
    process.env.EXPLORE_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
  )
    .trim()
    .toLowerCase();
  const realFacilityEmail = String(facilityEmail || "")
    .trim()
    .toLowerCase();

  const recipients = [];
  const seen = new Set();

  const addRecipient = (email, shouldTrackOpen) => {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    recipients.push({ email: normalized, shouldTrackOpen });
  };

  // Admin always gets a copy (no open-tracking).
  addRecipient(adminEmail, false);

  // Real facility email only — never the smith12 test inbox.
  if (realFacilityEmail && !isPlaceholderFacilityEmail(realFacilityEmail)) {
    addRecipient(realFacilityEmail, true);
  }

  return recipients;
};

/**
 * Notify admins + facility when a logged-in user clicks Contact on a facility card.
 * Also creates a Lead (shown in admin Leads as New).
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
    email: facilityEmailBody = "",
    website = "",
    destinationUrl = "",
    sourcePlatform = "",
    careType = "",
    category = "",
  } = req.body || {};

  const resolvedName = String(facilityName || name || "").trim() || "Unknown facility";
  const resolvedDestination = String(destinationUrl || website || "").trim();
  const resolvedCareType = "Assisted Living";
  let resolvedAddress = cleanFacilityField(address);
  let resolvedZip = cleanFacilityField(zipCode);
  let resolvedPhone = cleanFacilityField(phone);
  let resolvedFacilityEmail = cleanFacilityField(facilityEmailBody).toLowerCase();
  const resolvedFacilityId = String(facilityId || "").trim();

  // Hydrate contact details from owned Facility records when Contact payload is incomplete
  try {
    let facilityDoc = null;
    const ownedIdMatch = resolvedFacilityId.match(/^owned-(.+)$/i);
    const mongoId =
      ownedIdMatch?.[1] ||
      (mongoose.Types.ObjectId.isValid(resolvedFacilityId) ? resolvedFacilityId : "");

    if (mongoId && mongoose.Types.ObjectId.isValid(mongoId)) {
      facilityDoc = await Facility.findById(mongoId)
        .select("name address phone email zip_code is_external")
        .lean();
    }
    if (!facilityDoc && resolvedName) {
      facilityDoc = await Facility.findOne({
        name: new RegExp(`^${resolvedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        is_external: { $ne: true },
      })
        .select("name address phone email zip_code is_external")
        .lean();
    }
    if (facilityDoc) {
      resolvedAddress = resolvedAddress || cleanFacilityField(facilityDoc.address);
      resolvedPhone = resolvedPhone || cleanFacilityField(facilityDoc.phone);
      resolvedFacilityEmail =
        resolvedFacilityEmail || cleanFacilityField(facilityDoc.email).toLowerCase();
      resolvedZip = resolvedZip || cleanFacilityField(facilityDoc.zip_code);
    }
  } catch (err) {
    console.warn("[explore-click] facility hydrate failed:", err?.message || err);
  }

  if (isPlaceholderFacilityEmail(resolvedFacilityEmail)) {
    resolvedFacilityEmail = "";
  }

  const recipients = resolveExploreRecipients(resolvedFacilityEmail);

  if (recipients.length === 0) {
    return res.status(200).json({ success: true, sent: 0, message: "No notify emails configured" });
  }

  const lead = await Lead.create({
    userId: user._id,
    userName: user.name || "",
    userEmail: user.email || "",
    facilityId: resolvedFacilityId,
    facilityName: resolvedName,
    facilityAddress: resolvedAddress,
    facilityPhone: resolvedPhone,
    facilityEmail: resolvedFacilityEmail,
    facilityZip: resolvedZip,
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

  const sentAt =
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }) + " EST";

  const clientBaseUrl = resolveClientBaseUrl(req);
  const signupUrl = `${clientBaseUrl}/register`;
  const loginUrl = `${clientBaseUrl}/signin`;

  const results = await Promise.allSettled(
    recipients.map(async ({ email: recipientEmail, shouldTrackOpen }) => {
      let trackingPixelUrl = "";
      if (shouldTrackOpen) {
        const token = crypto.randomBytes(24).toString("hex");
        await EmailTrack.create({
          token,
          type: "explore_click",
          recipientEmail,
          userId: user._id,
          userName: user.name || "",
          userEmail: user.email || "",
          facilityId: resolvedFacilityId,
          facilityName: resolvedName,
          destinationUrl: resolvedDestination,
          leadId: lead._id,
        });
        trackingPixelUrl = `${apiBase}/api/email/track/${token}.gif`;
      }

      console.log(
        `[explore-click] sending to ${recipientEmail}${trackingPixelUrl ? ` track=${trackingPixelUrl}` : ""}`,
      );

      await sendMail({
        email: recipientEmail,
        subject: `Someone is interested in ${resolvedName}`,
        template: "explore-click.ejs",
        data: {
          userName: user.name || "User",
          userEmail: user.email || "",
          facilityName: resolvedName,
          facilityId: resolvedFacilityId,
          address: resolvedAddress,
          zipCode: resolvedZip,
          phone: resolvedPhone,
          website: String(website || "").trim(),
          destinationUrl: resolvedDestination,
          sourcePlatform: String(sourcePlatform || "").trim(),
          careType: resolvedCareType,
          sentAt,
          trackingPixelUrl,
          signupUrl,
          loginUrl,
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
    errors: failed,
    leadId: lead._id,
    recipients: recipients.map((r) => r.email),
    facilityEmail: resolvedFacilityEmail || null,
    trackedEmail: recipients.find((r) => r.shouldTrackOpen)?.email || null,
  });
});
