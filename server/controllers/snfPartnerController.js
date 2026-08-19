import crypto from "crypto";
import validator from "email-validator";

import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendMail from "../utils/sendMail.js";
import { resolveClientBaseUrl } from "../utils/resolveClientBaseUrl.js";
import User from "../models/userModel.js";
import SnfPartner, { SnfReferral, ensureSnfReferralIndexes } from "../models/snfPartnerModel.js";
import { normalizeFacilityWebsite } from "../utils/normalizeFacilityWebsite.js";

const RESET_PASSWORD_TOKEN_MINUTES = 60;

const requireAdmin = async (userId) => {
  const user = await User.findById(userId).select("role user_type");
  return user?.role === "admin" || user?.user_type === "admin";
};

const findLinkedSnfPartner = async (userId) => {
  const user = await User.findById(userId).select("role name phone");
  if (!user) return { user: null, partner: null };
  const partner = await SnfPartner.findOne({ facilityUserId: user._id });
  if (partner && user.role !== "snf") {
    user.role = "snf";
    await user.save({ validateBeforeSave: false });
  }
  return { user, partner };
};

const partnerReferralStats = async (partnerId) => {
  const [total, recent] = await Promise.all([
    SnfReferral.countDocuments({ snfPartnerId: partnerId }),
    SnfReferral.find({ snfPartnerId: partnerId })
      .sort({ checkedInAt: -1 })
      .limit(25)
      .populate("scannedBy", "name email phone")
      .populate("checkedInBy", "name email phone")
      .lean(),
  ]);
  return { total, recent };
};

const visitorFromUser = (user) => {
  if (!user) return { id: "", name: "", email: "", phone: "" };
  return {
    id: String(user._id || ""),
    name: String(user.name || "").trim(),
    email: String(user.email || "").trim().toLowerCase(),
    phone: String(user.phone || "").trim(),
  };
};

const serializeReferralRow = (referral, extra = {}) => {
  const visitor = visitorFromUser(referral.scannedBy);
  const checkedInUser = visitorFromUser(referral.checkedInBy);
  const display = visitor.email || visitor.name ? visitor : checkedInUser;
  return {
    id: referral._id,
    referralCode: referral.referralCode,
    status: referral.status,
    checkedInAt: referral.checkedInAt,
    visitorName: display.name || "",
    visitorEmail: display.email || "",
    visitorPhone: display.phone || "",
    visitorId: display.id || "",
    ...extra,
  };
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

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const serializePartner = (partner, referralCount = 0, activeCount = 0, referralLink = "") => ({
  id: partner._id,
  name: partner.name,
  contactPerson: partner.contactPerson || partner.name,
  email: partner.email,
  phone: partner.phone,
  website: partner.website || "",
  address: partner.address || "",
  zip_code: partner.zip_code || "",
  pricing: partner.pricing || "",
  services: partner.services || [],
  amenities: partner.amenities || [],
  care_levels: partner.care_levels || [],
  units: partner.units || 0,
  occupancy: partner.occupancy || 0,
  images: partner.images || [],
  partnershipType: partner.partnershipType || "Skilled Nursing",
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
  `${resolveClientBaseUrl(req)}/snf-referral/${encodeURIComponent(code)}`;

const serializePublicPartner = (partner) => ({
  id: String(partner._id),
  name: partner.name,
  phone: partner.phone,
  email: partner.email,
  website: partner.website || "",
  address: partner.address || "",
  zip_code: partner.zip_code || "",
  pricing: partner.pricing || "",
  services: partner.services || [],
  amenities: partner.amenities || [],
  care_levels: partner.care_levels?.length ? partner.care_levels : ["Skilled Nursing"],
  units: partner.units || 0,
  occupancy: partner.occupancy || 0,
  images: partner.images || [],
  partnershipType: partner.partnershipType || "Skilled Nursing",
});

export const createSnfPartner = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }

  const {
    name,
    facilityName,
    email,
    phone,
    website = "",
    address = "",
    zip_code = "",
    pricing = "",
    services,
    amenities,
    care_levels,
    units,
    occupancy,
  } = req.body || {};
  const partnerName = String(name || facilityName || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!partnerName || !phone) {
    return next(new ErrorHandler("Facility name and phone are required", 400));
  }
  if (!validator.validate(normalizedEmail)) {
    return next(new ErrorHandler("A valid contact email is required", 400));
  }
  const zipDigits = String(zip_code || "").replace(/\D/g, "").slice(0, 5)
    || (String(address || "").match(/\b(\d{5})(?:-\d{4})?\b/) || [])[1]
    || "";
  if (zipDigits.length !== 5) {
    return next(new ErrorHandler("Include a valid 5-digit ZIP in the address", 400));
  }
  if (await User.findOne({ email: normalizedEmail })) {
    return next(new ErrorHandler("A user with this email already exists", 400));
  }
  if (await SnfPartner.findOne({ email: normalizedEmail })) {
    return next(new ErrorHandler("An SNF partner with this email already exists", 400));
  }

  const temporaryPassword = makeTemporaryPassword();
  const facilityUser = await User.create({
    name: partnerName,
    email: normalizedEmail,
    password: temporaryPassword,
    phone: String(phone).trim(),
    is_verified: true,
    user_type: "user",
    role: "snf",
  });

  const uploadedImages = Array.isArray(req.files)
    ? req.files.map((file) => `/uploads/facilities/${file.filename}`)
    : [];
  const careLevels = toArray(care_levels);
  const partner = await SnfPartner.create({
    name: partnerName,
    contactPerson: partnerName,
    email: normalizedEmail,
    phone: String(phone).trim(),
    website: normalizeFacilityWebsite(website),
    address: String(address || "").trim(),
    zip_code: zipDigits,
    pricing: String(pricing || "").trim(),
    services: toArray(services),
    amenities: toArray(amenities),
    care_levels: careLevels.length ? careLevels : ["Skilled Nursing"],
    units: Number(units) || 0,
    occupancy: Number(occupancy) || 0,
    images: uploadedImages,
    partnershipType: "Skilled Nursing",
    referralCode: makeReferralCode(partnerName),
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
        user: { name: partner.name },
        facility: { name: partner.name },
        username: normalizedEmail,
        temporaryPassword,
        loginUrl: `${clientBaseUrl}/signin`,
        resetLink: `${clientBaseUrl}/reset-password?token=${resetToken}`,
        dashboardUrl: `${clientBaseUrl}/snf`,
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

export const getMySnfPartner = catchAsyncError(async (req, res, next) => {
  const { user, partner } = await findLinkedSnfPartner(req.user?.id);
  if (!user) return next(new ErrorHandler("User not found", 404));
  if (!partner) {
    return next(new ErrorHandler("No SNF partner profile is linked to this account", 404));
  }
  const { total, recent } = await partnerReferralStats(partner._id);
  return res.json({
    success: true,
    partner: serializePartner(partner, total, 0, publicReferralLink(req, partner.referralCode)),
    referrals: recent.map((referral) => serializeReferralRow(referral)),
  });
});

export const updateMySnfPartner = catchAsyncError(async (req, res, next) => {
  const { user, partner } = await findLinkedSnfPartner(req.user?.id);
  if (!user) return next(new ErrorHandler("User not found", 404));
  if (!partner) {
    return next(new ErrorHandler("No SNF partner profile is linked to this account", 404));
  }

  const {
    name,
    phone,
    address,
    zip_code,
    pricing,
    website,
    services,
    amenities,
    care_levels,
    units,
    occupancy,
  } = req.body || {};

  if (name != null) {
    const trimmed = String(name).trim();
    if (!trimmed) return next(new ErrorHandler("Facility name cannot be empty", 400));
    partner.name = trimmed;
    partner.contactPerson = trimmed;
    user.name = trimmed;
  }
  if (phone != null) {
    const trimmed = String(phone).trim();
    if (!trimmed) return next(new ErrorHandler("Phone cannot be empty", 400));
    partner.phone = trimmed;
    user.phone = trimmed;
  }
  if (address != null) {
    partner.address = String(address).trim();
  }
  if (zip_code != null) {
    const zipDigits = String(zip_code || "").replace(/\D/g, "").slice(0, 5);
    if (zipDigits.length !== 5) {
      return next(new ErrorHandler("A valid 5-digit ZIP code is required", 400));
    }
    partner.zip_code = zipDigits;
  }
  if (pricing != null) partner.pricing = String(pricing).trim();
  if (website != null) partner.website = normalizeFacilityWebsite(website);
  if (services != null) partner.services = toArray(services);
  if (amenities != null) partner.amenities = toArray(amenities);
  if (care_levels != null) {
    const levels = toArray(care_levels);
    partner.care_levels = levels.length ? levels : ["Skilled Nursing"];
  }
  if (units != null && units !== "") partner.units = Math.max(0, Number(units) || 0);
  if (occupancy != null && occupancy !== "") {
    partner.occupancy = Math.max(0, Number(occupancy) || 0);
  }

  let keepPaths = partner.images || [];
  try {
    if (req.body.keep_image_paths != null && req.body.keep_image_paths !== "") {
      const parsed = JSON.parse(req.body.keep_image_paths);
      if (Array.isArray(parsed)) {
        keepPaths = parsed.filter(
          (p) => typeof p === "string" && (partner.images || []).includes(p),
        );
      }
    }
  } catch {
    keepPaths = partner.images || [];
  }
  const newUploads = Array.isArray(req.files)
    ? req.files.map((file) => `/uploads/facilities/${file.filename}`)
    : [];
  if (req.body.keep_image_paths != null || newUploads.length) {
    partner.images = [...keepPaths, ...newUploads].slice(0, 8);
  }

  await Promise.all([partner.save(), user.save()]);
  const { total } = await partnerReferralStats(partner._id);
  return res.json({
    success: true,
    message: "SNF profile updated successfully.",
    partner: serializePartner(partner, total, 0, publicReferralLink(req, partner.referralCode)),
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
    .populate("scannedBy", "name email phone")
    .populate("checkedInBy", "name email phone")
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
    referrals: recent.map((referral) =>
      serializeReferralRow(referral, {
        source: referral.snfPartnerId?.name || "Unknown SNF",
      }),
    ),
  });
});

const rememberUserSnfScan = async (userId, partner) => {
  const user = await User.findById(userId).select("scanned_snfs");
  if (!user) return;
  const partnerId = String(partner._id);
  const rows = Array.isArray(user.scanned_snfs) ? user.scanned_snfs : [];
  const existing = rows.find((row) => String(row.partnerId) === partnerId);
  if (existing) {
    existing.scannedAt = new Date();
  } else {
    rows.unshift({ partnerId: partner._id, scannedAt: new Date() });
  }
  user.scanned_snfs = rows;
  await user.save({ validateBeforeSave: false });
};

const recordSnfReferralScan = async ({
  referralCode,
  partnerId,
  userId,
  checkedInBy = null,
}) => {
  const existingForUser = userId
    ? await SnfReferral.findOne({
        snfPartnerId: partnerId,
        scannedBy: userId,
      }).sort({ checkedInAt: -1 })
    : null;
  if (existingForUser) {
    existingForUser.checkedInAt = new Date();
    if (checkedInBy) existingForUser.checkedInBy = checkedInBy;
    await existingForUser.save();
    return existingForUser;
  }

  try {
    return await SnfReferral.create({
      referralCode,
      snfPartnerId: partnerId,
      scannedBy: userId || null,
      checkedInBy,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    try {
      await ensureSnfReferralIndexes();
      return await SnfReferral.create({
        referralCode,
        snfPartnerId: partnerId,
        scannedBy: userId || null,
        checkedInBy,
      });
    } catch (retryError) {
      if (retryError?.code !== 11000) throw retryError;
      const existing = await SnfReferral.findOne({ referralCode }).sort({ checkedInAt: -1 });
      if (!existing) throw retryError;
      if (userId) existing.scannedBy = userId;
      existing.checkedInAt = new Date();
      if (checkedInBy) existing.checkedInBy = checkedInBy;
      await existing.save();
      return existing;
    }
  }
};

export const checkInSnfReferral = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }
  const referralCode = String(req.body?.referralCode || "").trim().toUpperCase();
  if (!referralCode) return next(new ErrorHandler("Referral code is required", 400));

  const partner = await SnfPartner.findOne({ referralCode });
  if (!partner) return next(new ErrorHandler("Referral code was not found", 404));

  const referral = await recordSnfReferralScan({
    referralCode,
    partnerId: partner._id,
    userId: req.user.id,
    checkedInBy: req.user.id,
  });
  return res.status(201).json({
    success: true,
    message: `Referral from ${partner.name} checked in.`,
    referral,
  });
});

/** Legacy QR / API URL. Send visitors to the frontend SNF referral page. */
export const scanSnfReferral = catchAsyncError(async (req, res, next) => {
  const referralCode = String(req.params.code || "").trim().toUpperCase();
  const partner = await SnfPartner.findOne({ referralCode }).select("referralCode");
  if (!partner) return next(new ErrorHandler("Referral code was not found", 404));

  const clientBaseUrl = resolveClientBaseUrl(req);
  return res.redirect(
    302,
    `${clientBaseUrl}/snf-referral/${encodeURIComponent(partner.referralCode)}`,
  );
});

export const getPublicSnfByReferralCode = catchAsyncError(async (req, res, next) => {
  const referralCode = String(req.params.code || "").trim().toUpperCase();
  const partner = await SnfPartner.findOne({ referralCode });
  if (!partner) return next(new ErrorHandler("Referral code was not found", 404));
  return res.json({
    success: true,
    partner: serializePublicPartner(partner),
  });
});

export const claimSnfReferral = catchAsyncError(async (req, res, next) => {
  const referralCode = String(req.body?.referralCode || req.params.code || "")
    .trim()
    .toUpperCase();
  if (!referralCode) return next(new ErrorHandler("Referral code is required", 400));

  const partner = await SnfPartner.findOne({ referralCode });
  if (!partner) return next(new ErrorHandler("Referral code was not found", 404));

  const userId = req.user?.id;
  await rememberUserSnfScan(userId, partner);
  try {
    await recordSnfReferralScan({
      referralCode,
      partnerId: partner._id,
      userId,
    });
  } catch (error) {
    console.error("SNF referral scan log failed:", error?.message || error);
  }

  return res.json({
    success: true,
    partner: serializePublicPartner(partner),
  });
});

export const getMyScannedSnfs = catchAsyncError(async (req, res, next) => {
  const userId = req.user?.id;
  const user = await User.findById(userId).select("scanned_snfs");
  const fromUser = Array.isArray(user?.scanned_snfs) ? user.scanned_snfs : [];
  const scannedAtById = new Map(
    fromUser
      .filter((row) => row?.partnerId)
      .map((row) => [String(row.partnerId), row.scannedAt]),
  );

  const referrals = await SnfReferral.find({ scannedBy: userId })
    .sort({ checkedInAt: -1 })
    .populate("snfPartnerId")
    .lean();

  for (const referral of referrals) {
    const id = String(referral.snfPartnerId?._id || "");
    if (!id || scannedAtById.has(id)) continue;
    scannedAtById.set(id, referral.checkedInAt || referral.createdAt);
  }

  const ids = [...scannedAtById.keys()];
  const docs = ids.length
    ? await SnfPartner.find({ _id: { $in: ids } }).lean()
    : [];
  const docById = new Map(docs.map((doc) => [String(doc._id), doc]));

  const partners = ids
    .map((id) => {
      const doc = docById.get(id);
      if (!doc) return null;
      return {
        ...serializePublicPartner(doc),
        scannedAt: scannedAtById.get(id),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.scannedAt || 0) - new Date(a.scannedAt || 0));

  return res.json({ success: true, partners });
});
