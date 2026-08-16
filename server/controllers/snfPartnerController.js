import crypto from "crypto";
import validator from "email-validator";

import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendMail from "../utils/sendMail.js";
import { resolveClientBaseUrl } from "../utils/resolveClientBaseUrl.js";
import User from "../models/userModel.js";
import SnfPartner, { SnfReferral } from "../models/snfPartnerModel.js";

const RESET_PASSWORD_TOKEN_MINUTES = 60;

const requireAdmin = async (userId) => {
  const user = await User.findById(userId).select("role user_type");
  return user?.role === "admin" || user?.user_type === "admin";
};

const makeReferralCode = (name) => {
  const prefix =
    String(name || "SNF")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 3)
      .toUpperCase() || "SNF";
  return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

const makeTemporaryPassword = () =>
  `Cm!${crypto.randomBytes(8).toString("base64url")}`;

const serializePartner = (partner, referralCount = 0, activeCount = 0, referralLink = "") => ({
  id: partner._id,
  name: partner.name,
  contactPerson: partner.contactPerson,
  email: partner.email,
  phone: partner.phone,
  partnershipType: partner.partnershipType,
  referralCode: partner.referralCode,
  referralLink,
  qrImageUrl: `https://quickchart.io/qr?size=360&text=${encodeURIComponent(
    referralLink,
  )}`,
  totalReferrals: referralCount,
  activeReferrals: activeCount,
  createdAt: partner.createdAt,
});

const publicReferralLink = (req, code) =>
  `${req.protocol}://${req.get("host")}/api/snf-partners/referral/${encodeURIComponent(code)}`;

export const createSnfPartner = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }

  const { facilityName, contactPerson, email, phone, partnershipType = "" } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!String(facilityName || "").trim() || !String(contactPerson || "").trim() || !phone) {
    return next(new ErrorHandler("Facility name, contact person, and phone are required", 400));
  }
  if (!validator.validate(normalizedEmail)) {
    return next(new ErrorHandler("A valid contact email is required", 400));
  }
  if (await User.findOne({ email: normalizedEmail })) {
    return next(new ErrorHandler("A user with this email already exists", 400));
  }
  if (await SnfPartner.findOne({ email: normalizedEmail })) {
    return next(new ErrorHandler("An SNF partner with this email already exists", 400));
  }

  const temporaryPassword = makeTemporaryPassword();
  const facilityUser = await User.create({
    name: String(contactPerson).trim(),
    email: normalizedEmail,
    password: temporaryPassword,
    phone: String(phone).trim(),
    is_verified: true,
    user_type: "user",
    // SNF partners have a dedicated partner record, not a Care Explorer
    // facility listing; send them to the standard signed-in portal.
    role: "user",
  });

  const partner = await SnfPartner.create({
    name: String(facilityName).trim(),
    contactPerson: String(contactPerson).trim(),
    email: normalizedEmail,
    phone: String(phone).trim(),
    partnershipType: String(partnershipType).trim(),
    referralCode: makeReferralCode(facilityName),
    facilityUserId: facilityUser._id,
    createdBy: req.user.id,
  });

  const resetToken = facilityUser.getToken(RESET_PASSWORD_TOKEN_MINUTES);
  await facilityUser.save({ validateBeforeSave: false });
  const clientBaseUrl = resolveClientBaseUrl(req);

  try {
    await sendMail({
      email: normalizedEmail,
      subject: `Welcome to CareMatch AI – ${partner.name} partner account`,
      template: "facility-onboarding.ejs",
      data: {
        user: { name: partner.contactPerson },
        facility: { name: partner.name },
        username: normalizedEmail,
        temporaryPassword,
        loginUrl: `${clientBaseUrl}/signin`,
        resetLink: `${clientBaseUrl}/reset-password?token=${resetToken}`,
        dashboardUrl: `${clientBaseUrl}/portal`,
        signupUrl: `${clientBaseUrl}/register`,
      },
    });
  } catch (error) {
    await SnfPartner.deleteOne({ _id: partner._id });
    await User.deleteOne({ _id: facilityUser._id });
    return next(new ErrorHandler("SNF partner was not created because invite email failed", 500));
  }

  return res.status(201).json({
    success: true,
    message: "SNF partner created and sign-in invite sent.",
    partner: serializePartner(
      partner,
      0,
      0,
      publicReferralLink(req, partner.referralCode),
    ),
  });
});

export const getSnfDashboard = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }
  const partners = await SnfPartner.find().sort({ createdAt: -1 }).lean();
  const ids = partners.map((p) => p._id);
  const counts = await SnfReferral.aggregate([
    { $match: { snfPartnerId: { $in: ids } } },
    { $group: { _id: "$snfPartnerId", total: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((row) => [String(row._id), row.total]));
  const totalReferrals = counts.reduce((sum, row) => sum + row.total, 0);
  const recent = await SnfReferral.find()
    .sort({ checkedInAt: -1 })
    .limit(25)
    .populate("snfPartnerId", "name")
    .lean();

  return res.json({
    success: true,
    summary: {
      partnerCount: partners.length,
      totalReferrals,
    },
    partners: partners.map((partner) =>
      serializePartner(
        partner,
        countMap.get(String(partner._id)) || 0,
        0,
        publicReferralLink(req, partner.referralCode),
      ),
    ),
    referrals: recent.map((referral) => ({
      id: referral._id,
      referralCode: referral.referralCode,
      source: referral.snfPartnerId?.name || "Unknown SNF",
      status: referral.status,
      checkedInAt: referral.checkedInAt,
    })),
  });
});

export const checkInSnfReferral = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }
  const referralCode = String(req.body?.referralCode || "").trim().toUpperCase();
  if (!referralCode) return next(new ErrorHandler("Referral code is required", 400));

  const partner = await SnfPartner.findOne({ referralCode });
  if (!partner) return next(new ErrorHandler("Referral code was not found", 404));

  const referral = await SnfReferral.create({
    referralCode,
    snfPartnerId: partner._id,
    checkedInBy: req.user.id,
  });
  return res.status(201).json({
    success: true,
    message: `Referral from ${partner.name} checked in.`,
    referral,
  });
});

/** QR destination. Every phone scan is counted before sending the visitor to CareMatch. */
export const scanSnfReferral = catchAsyncError(async (req, res, next) => {
  const referralCode = String(req.params.code || "").trim().toUpperCase();
  const partner = await SnfPartner.findOne({ referralCode });
  if (!partner) return next(new ErrorHandler("Referral code was not found", 404));

  await SnfReferral.create({
    referralCode,
    snfPartnerId: partner._id,
  });

  const clientBaseUrl = resolveClientBaseUrl(req);
  return res.redirect(
    302,
    `${clientBaseUrl}/signin?referral=${encodeURIComponent(referralCode)}`,
  );
});
