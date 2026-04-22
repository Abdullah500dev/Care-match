import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import validator from "email-validator";

import catchAsyncError from "../middleware/catchAsyncErrors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FACILITY_UPLOAD_DIR = path.join(__dirname, "../uploads/facilities");

const safeRemoveFacilityImageFile = (relativePath) => {
  if (!relativePath || typeof relativePath !== "string") return;
  if (!relativePath.startsWith("/uploads/facilities/")) return;
  const base = path.basename(relativePath);
  if (!base || base === "." || base === "..") return;
  const abs = path.join(FACILITY_UPLOAD_DIR, base);
  const resolved = path.normalize(abs);
  if (!resolved.startsWith(path.normalize(FACILITY_UPLOAD_DIR))) return;
  fs.unlink(resolved, () => {});
};
import ErrorHandler from "../utils/errorHandler.js";
import sendMail from "../utils/sendMail.js";
import { greetingNameForEmail } from "../utils/greetingNameForEmail.js";
import { resolveClientBaseUrl } from "../utils/resolveClientBaseUrl.js";
import User from "../models/userModel.js";
import Facility from "../models/facilityModel.js";
import { RESET_PASSWORD_TOKEN_MINUTES } from "../config/authConstants.js";

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

const toOptionalString = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

const syntheticExternalEmail = (sourcePlatform, externalRef) => {
  const seed = `${sourcePlatform || "external"}-${externalRef || Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${seed || "external-facility"}@external.carematch.local`;
};

const generateTemporaryPassword = () => {
  const random = crypto.randomBytes(8).toString("base64url").slice(0, 8);
  return `CmAI!${random}9`;
};

const APIFY_ACTOR_ID = "parseforge/cms-nursing-home-ratings-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";

const pickFirstNonEmpty = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
};

const toNumberOrNull = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/[^\d.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const toMonthlyPricingText = (rawValue) => {
  const raw = toOptionalString(rawValue);
  if (!raw) return "";
  if (/\$|month|mo|\/m|weekly|week|daily|day|year|yr/i.test(raw)) return raw;
  const parsed = toNumberOrNull(raw);
  if (parsed == null || parsed <= 0) return raw;
  return `$${parsed.toLocaleString("en-US")}/mo`;
};

const normalizeApifyNursingHomeRow = (row = {}) => {
  const providerName = toOptionalString(
    pickFirstNonEmpty(row, ["providerName", "name", "Provider Name"])
  );
  const city = toOptionalString(pickFirstNonEmpty(row, ["city", "City"]));
  const state = toOptionalString(pickFirstNonEmpty(row, ["state", "State"]));
  const zipCode = toOptionalString(
    pickFirstNonEmpty(row, ["zipCode", "zip", "zipcode", "ZIP Code"])
  );
  const phoneNumber = toOptionalString(
    pickFirstNonEmpty(row, ["phoneNumber", "phone", "Phone Number"])
  );
  const providerUrl = toOptionalString(
    pickFirstNonEmpty(row, ["providerUrl", "providerURL", "url", "Provider URL", "profileUrl"])
  );
  const overallRatingRaw = pickFirstNonEmpty(row, [
    "overallRating",
    "overall_star_rating",
    "Overall Rating",
  ]);
  const finesRaw = pickFirstNonEmpty(row, [
    "totalFinesAmount",
    "totalFines",
    "total_fines_amount",
    "Total Fines Amount",
  ]);
  const overallRating = toNumberOrNull(overallRatingRaw);
  const totalFinesAmount = toNumberOrNull(finesRaw);
  const pricingRaw = pickFirstNonEmpty(row, [
    "pricing",
    "price",
    "monthlyPrice",
    "monthlyCost",
    "averageMonthlyCost",
    "avgMonthlyCost",
    "estimatedMonthlyCost",
    "privatePayRate",
    "costPerMonth",
    "Price",
    "Monthly Price",
    "Monthly Cost",
    "Estimated Monthly Cost",
  ]);
  const pricing = toMonthlyPricingText(pricingRaw);

  return {
    providerName,
    city,
    state,
    zipCode,
    phoneNumber,
    overallRating,
    totalFinesAmount,
    providerUrl,
    pricing,
  };
};

const toExternalFacilityDoc = (normalizedRow) => {
  const {
    providerName,
    city,
    state,
    zipCode,
    phoneNumber,
    overallRating,
    totalFinesAmount,
    providerUrl,
    pricing,
  } = normalizedRow;

  const locationParts = [city, state, zipCode].filter(Boolean);
  const address = locationParts.join(", ") || "N/A";
  const externalRef = providerUrl || `${providerName}::${city}::${state}::${zipCode}`;
  const ratingText = overallRating == null ? "N/A" : String(overallRating);
  const finesText = totalFinesAmount == null ? "N/A" : `$${totalFinesAmount.toLocaleString("en-US")}`;

  return {
    is_external: true,
    source_platform: "apify",
    external_ref: externalRef,
    email: syntheticExternalEmail("apify", externalRef),
    name: providerName || "Unknown Provider",
    phone: phoneNumber || "N/A",
    address,
    website: providerUrl,
    specialty: ["Skilled Nursing"],
    description: `CMS overall rating: ${ratingText}. Total fines amount: ${finesText}.`,
    services: [],
    amenities: [],
    care_levels: [],
    pricing: pricing || "",
    images: [],
    external_data: {
      provider_name: providerName,
      city,
      state,
      zip_code: zipCode,
      phone_number: phoneNumber,
      overall_rating: overallRating,
      total_fines_amount: totalFinesAmount,
      provider_url: providerUrl,
      pricing: pricing || "",
    },
  };
};

const upsertExternalFacilities = async (records) => {
  let created = 0;
  let updated = 0;

  for (const item of records) {
    const existing = await Facility.findOne({
      is_external: true,
      source_platform: item.source_platform,
      external_ref: item.external_ref,
    });

    if (existing) {
      Object.assign(existing, item);
      await existing.save();
      updated += 1;
    } else {
      await Facility.create(item);
      created += 1;
    }
  }

  return { created, updated };
};

export const syncFacilitiesFromApify = async (actorInput = {}) => {
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    throw new Error("APIFY_TOKEN is required in environment variables");
  }

  const safeActorInput =
    actorInput && typeof actorInput === "object" ? actorInput : {};
  const runUrl = `${APIFY_BASE_URL}/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${encodeURIComponent(apifyToken)}`;

  const runResponse = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safeActorInput),
  });

  if (!runResponse.ok) {
    const errorText = await runResponse.text();
    throw new Error(`Failed to start Apify actor run: ${errorText}`);
  }

  const runPayload = await runResponse.json();
  const runId = runPayload?.data?.id;
  if (!runId) {
    throw new Error("Apify run started but run id is missing");
  }

  const waitUrl = `${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(runId)}?waitForFinish=120&token=${encodeURIComponent(apifyToken)}`;
  const waitResponse = await fetch(waitUrl);
  if (!waitResponse.ok) {
    const errorText = await waitResponse.text();
    throw new Error(`Failed while waiting for Apify run: ${errorText}`);
  }

  const waitPayload = await waitResponse.json();
  const runStatus = waitPayload?.data?.status;
  const datasetId = waitPayload?.data?.defaultDatasetId;
  if (runStatus !== "SUCCEEDED" || !datasetId) {
    throw new Error(
      `Apify run did not succeed. Current status: ${runStatus || "UNKNOWN"}`
    );
  }

  const datasetUrl = `${APIFY_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&token=${encodeURIComponent(apifyToken)}`;
  const datasetResponse = await fetch(datasetUrl);
  if (!datasetResponse.ok) {
    const errorText = await datasetResponse.text();
    throw new Error(`Failed to fetch Apify dataset items: ${errorText}`);
  }

  const rows = await datasetResponse.json();
  const normalized = Array.isArray(rows)
    ? rows.map(normalizeApifyNursingHomeRow).filter((item) => item.providerName)
    : [];

  if (normalized.length === 0) {
    throw new Error("Apify returned no valid nursing home records");
  }

  const prepared = normalized.map(toExternalFacilityDoc);
  const { created, updated } = await upsertExternalFacilities(prepared);

  return {
    actor: APIFY_ACTOR_ID,
    runId,
    totalScraped: normalized.length,
    created,
    updated,
    fields: normalized.map((item) => ({
      provider_name: item.providerName,
      city: item.city,
      state: item.state,
      zip_code: item.zipCode,
      phone_number: item.phoneNumber,
      overall_rating: item.overallRating,
      total_fines_amount: item.totalFinesAmount,
      provider_url: item.providerUrl,
      pricing: item.pricing || "",
    })),
  };
};

export const createFacility = catchAsyncError(async (req, res, next) => {
  const adminId = req.user?.id;
  const admin = await User.findById(adminId);

  if (!admin || admin.user_type !== "admin") {
    return next(new ErrorHandler("Only admins can create facilities", 403));
  }

  const {
    name,
    email,
    phone,
    address,
    website,
    specialty,
    description,
    services,
    amenities,
    care_levels,
    units,
    occupancy,
    active_leads,
    pricing,
  } = req.body;

  if (!validator.validate(email)) {
    return next(new ErrorHandler("Invalid facility email", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler("A user with this email already exists", 400));
  }

  const existingFacility = await Facility.findOne({ email });
  if (existingFacility) {
    return next(new ErrorHandler("A facility with this email already exists", 400));
  }

  const temporaryPassword = generateTemporaryPassword();
  const normalizedServices = toArray(services);
  const normalizedAmenities = toArray(amenities);
  const normalizedSpecialty = toArray(specialty);
  const normalizedUnits = Number(units) || 0;
  const normalizedOccupancy = Number(occupancy) || 0;
  const normalizedActiveLeads = Number(active_leads) || 0;
  const normalizedCareLevels = toArray(care_levels);
  const uploadedImages = Array.isArray(req.files)
    ? req.files.map((file) => `/uploads/facilities/${file.filename}`)
    : [];

  const facilityUser = await User.create({
    name,
    email,
    password: temporaryPassword,
    phone,
    is_verified: true,
    user_type: "user",
    role: "facility",
  });

  const facility = await Facility.create({
    name,
    email,
    phone,
    address,
    website: toOptionalString(website),
    specialty: normalizedSpecialty,
    description: toOptionalString(description),
    services: normalizedServices,
    amenities: normalizedAmenities,
    care_levels: normalizedCareLevels,
    pricing,
    units: normalizedUnits,
    occupancy: normalizedOccupancy,
    active_leads: normalizedActiveLeads,
    images: uploadedImages,
    created_by: admin._id,
    user_id: facilityUser._id,
  });

  const resetToken = facilityUser.getToken(RESET_PASSWORD_TOKEN_MINUTES);
  await facilityUser.save({ validateBeforeSave: false });

  const clientBaseUrl = resolveClientBaseUrl(req);
  const resetLink = `${clientBaseUrl}/reset-password?token=${resetToken}`;
  const loginUrl = `${clientBaseUrl}/signin`;

  try {
    await sendMail({
      email: facilityUser.email,
      subject: "Your CareMatch AI facility account is ready",
      template: "facility-onboarding.ejs",
      data: {
        user: { name: greetingNameForEmail(facilityUser) },
        facility: { name: facility.name },
        username: facilityUser.email,
        temporaryPassword,
        loginUrl,
        resetLink,
      },
    });
  } catch (error) {
    await Facility.deleteOne({ _id: facility._id });
    await User.deleteOne({ _id: facilityUser._id });
    return next(new ErrorHandler("Facility created but invite email failed to send", 500));
  }

  res.status(201).json({
    success: true,
    message:
      "Facility created successfully. Credentials and password reset link sent by email.",
    facility,
  });
});

export const listFacilities = catchAsyncError(async (req, res, next) => {
  const adminId = req.user?.id;
  const admin = await User.findById(adminId);

  if (!admin || admin.user_type !== "admin") {
    return next(new ErrorHandler("Only admins can list facilities", 403));
  }

  const parsedPage = Number.parseInt(req.query.page, 10);
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : Math.min(parsedLimit, 100);
  const skip = (page - 1) * limit;

  const [facilities, total] = await Promise.all([
    Facility.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Facility.countDocuments(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.status(200).json({
    success: true,
    facilities,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

export const listPublicFacilities = catchAsyncError(async (req, res) => {
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 100 : Math.min(parsedLimit, 500);
  const externalOnly = String(req.query.externalOnly || "").toLowerCase() === "true";
  const query = externalOnly ? { is_external: true } : {};

  const facilities = await Facility.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    count: facilities.length,
    facilities,
  });
});

const assertAdmin = async (userId) => {
  const admin = await User.findById(userId);
  if (!admin || admin.user_type !== "admin") {
    return null;
  }
  return admin;
};

const assertFacilityUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.role !== "facility") {
    return null;
  }
  return user;
};

export const getMyFacility = catchAsyncError(async (req, res, next) => {
  const facilityUser = await assertFacilityUser(req.user?.id);
  if (!facilityUser) {
    return next(new ErrorHandler("Only facility users can access this resource", 403));
  }

  const facility = await Facility.findOne({ user_id: facilityUser._id }).lean();
  if (!facility) {
    return next(new ErrorHandler("Facility profile not found for this account", 404));
  }

  res.status(200).json({
    success: true,
    facility,
  });
});

export const updateMyFacility = catchAsyncError(async (req, res, next) => {
  const facilityUser = await assertFacilityUser(req.user?.id);
  if (!facilityUser) {
    return next(new ErrorHandler("Only facility users can update this resource", 403));
  }

  const facility = await Facility.findOne({ user_id: facilityUser._id });
  if (!facility) {
    return next(new ErrorHandler("Facility profile not found for this account", 404));
  }

  const {
    name,
    phone,
    address,
    pricing,
    website,
    specialty,
    description,
    services,
    amenities,
    care_levels,
    units,
    occupancy,
    active_leads,
  } = req.body;

  if (name != null) {
    const trimmed = String(name).trim();
    if (!trimmed) return next(new ErrorHandler("Facility name cannot be empty", 400));
    facility.name = trimmed;
    facilityUser.name = trimmed;
  }

  if (phone != null) {
    const trimmed = String(phone).trim();
    if (!trimmed) return next(new ErrorHandler("Phone cannot be empty", 400));
    facility.phone = trimmed;
    facilityUser.phone = trimmed;
  }

  if (address != null) {
    const trimmed = String(address).trim();
    if (!trimmed) return next(new ErrorHandler("Address cannot be empty", 400));
    facility.address = trimmed;
  }

  if (pricing != null) {
    facility.pricing = String(pricing).trim();
  }

  if (website != null) {
    facility.website = toOptionalString(website);
  }
  if (specialty != null) {
    facility.specialty = toArray(specialty);
  }
  if (description != null) {
    facility.description = toOptionalString(description);
  }

  if (services != null) {
    facility.services = toArray(services);
  }

  if (amenities != null) {
    facility.amenities = toArray(amenities);
  }

  if (care_levels != null) {
    facility.care_levels = toArray(care_levels);
  }

  if (units != null && units !== "") {
    facility.units = Math.max(0, Number(units) || 0);
  }
  if (occupancy != null && occupancy !== "") {
    facility.occupancy = Math.max(0, Number(occupancy) || 0);
  }
  if (active_leads != null && active_leads !== "") {
    facility.active_leads = Math.max(0, Number(active_leads) || 0);
  }

  await Promise.all([facility.save(), facilityUser.save()]);

  res.status(200).json({
    success: true,
    message: "Facility profile updated successfully.",
    facility,
  });
});

export const getFacility = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can view facility details", 403));
  }

  const facility = await Facility.findById(req.params.id).lean();
  if (!facility) {
    return next(new ErrorHandler("Facility not found", 404));
  }

  res.status(200).json({
    success: true,
    facility,
  });
});

export const updateFacility = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can update facilities", 403));
  }

  const facility = await Facility.findById(req.params.id);
  if (!facility) {
    return next(new ErrorHandler("Facility not found", 404));
  }

  const {
    name,
    email,
    phone,
    address,
    website,
    specialty,
    description,
    services,
    amenities,
    care_levels,
    pricing,
    units,
    occupancy,
    active_leads,
  } = req.body;

  if (!validator.validate(email)) {
    return next(new ErrorHandler("Invalid facility email", 400));
  }

  const normalizedEmail = email.toLowerCase().trim();

  const normalizedServices = toArray(services);
  const normalizedAmenities = toArray(amenities);
  const normalizedCareLevels = toArray(care_levels);
  const normalizedSpecialty = toArray(specialty);
  const normalizedUnits = Number(units) || 0;
  const normalizedOccupancy = Number(occupancy) || 0;
  const normalizedActiveLeads = Number(active_leads) || 0;
  let keepPaths = facility.images || [];
  try {
    if (req.body.keep_image_paths != null && req.body.keep_image_paths !== "") {
      const parsed = JSON.parse(req.body.keep_image_paths);
      if (Array.isArray(parsed)) {
        keepPaths = parsed.filter(
          (p) => typeof p === "string" && (facility.images || []).includes(p)
        );
      }
    }
  } catch {
    keepPaths = facility.images || [];
  }

  const newUploads = Array.isArray(req.files)
    ? req.files.map((file) => `/uploads/facilities/${file.filename}`)
    : [];

  const previousImages = facility.images || [];
  const mergedImages = [...keepPaths, ...newUploads].slice(0, 8);

  previousImages.forEach((oldPath) => {
    if (!mergedImages.includes(oldPath)) {
      safeRemoveFacilityImageFile(oldPath);
    }
  });

  if (normalizedEmail !== facility.email) {
    const duplicateUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: facility.user_id },
    });
    if (duplicateUser) {
      return next(new ErrorHandler("Another account already uses this email", 400));
    }
    const duplicateFacility = await Facility.findOne({
      email: normalizedEmail,
      _id: { $ne: facility._id },
    });
    if (duplicateFacility) {
      return next(new ErrorHandler("Another facility already uses this email", 400));
    }
  }

  const facilityUser = await User.findById(facility.user_id);
  if (!facilityUser) {
    return next(new ErrorHandler("Facility user record missing", 500));
  }

  facilityUser.name = name;
  facilityUser.email = normalizedEmail;
  facilityUser.phone = phone;
  await facilityUser.save();

  facility.name = name;
  facility.email = normalizedEmail;
  facility.phone = phone;
  facility.address = address;
  facility.website = toOptionalString(website);
  facility.specialty = normalizedSpecialty;
  facility.description = toOptionalString(description);
  facility.services = normalizedServices;
  facility.amenities = normalizedAmenities;
  facility.care_levels = normalizedCareLevels;
  facility.units = normalizedUnits;
  facility.occupancy = normalizedOccupancy;
  facility.active_leads = normalizedActiveLeads;
  facility.pricing = pricing || "";
  facility.images = mergedImages;
  await facility.save();

  res.status(200).json({
    success: true,
    message: "Facility updated successfully.",
    facility,
  });
});

export const deleteFacility = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can delete facilities", 403));
  }

  const facility = await Facility.findById(req.params.id);
  if (!facility) {
    return next(new ErrorHandler("Facility not found", 404));
  }

  (facility.images || []).forEach((p) => safeRemoveFacilityImageFile(p));

  if (facility.user_id) {
    await User.deleteOne({ _id: facility.user_id });
  }
  await Facility.deleteOne({ _id: facility._id });

  res.status(200).json({
    success: true,
    message: "Facility deleted successfully.",
  });
});

export const importFacilitiesFromApify = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can import external facilities", 403));
  }

  const actorInput =
    req.body?.actorInput && typeof req.body.actorInput === "object"
      ? req.body.actorInput
      : {};

  try {
    const result = await syncFacilitiesFromApify(actorInput);
    res.status(200).json({
      success: true,
      message: "Apify facilities import completed.",
      ...result,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message || "Apify import failed", 502));
  }
});

export const importExternalFacilities = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can import external facilities", 403));
  }

  const records = Array.isArray(req.body?.facilities) ? req.body.facilities : [];
  if (records.length === 0) {
    return next(new ErrorHandler("facilities array is required", 400));
  }

  const prepared = records
    .map((row) => {
      const name = toOptionalString(row?.name);
      const address = toOptionalString(row?.address);
      if (!name || !address) return null;
      const website = toOptionalString(row?.website);
      const sourcePlatform = toOptionalString(row?.source_platform || row?.source || "external");
      const externalRef =
        toOptionalString(row?.external_ref) ||
        toOptionalString(row?.id) ||
        `${name}::${address}`;
      return {
        is_external: true,
        source_platform: sourcePlatform,
        external_ref: externalRef,
        email: syntheticExternalEmail(sourcePlatform, externalRef),
        name,
        phone: toOptionalString(row?.phone || "N/A"),
        address,
        website,
        specialty: toArray(row?.specialty || row?.care_levels || row?.services),
        description: toOptionalString(row?.description),
        services: toArray(row?.services),
        amenities: toArray(row?.amenities),
        care_levels: toArray(row?.care_levels || row?.specialty),
        pricing: toOptionalString(row?.pricing),
        images: Array.isArray(row?.images)
          ? row.images.map((x) => toOptionalString(x)).filter(Boolean)
          : [],
      };
    })
    .filter(Boolean);

  if (prepared.length === 0) {
    return next(new ErrorHandler("No valid external facilities to import", 400));
  }

  const { created, updated } = await upsertExternalFacilities(prepared);

  res.status(200).json({
    success: true,
    message: "External facilities import completed.",
    created,
    updated,
    totalProcessed: prepared.length,
  });
});
