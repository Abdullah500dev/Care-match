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

const generateTemporaryPassword = () => {
  const random = crypto.randomBytes(8).toString("base64url").slice(0, 8);
  return `CmAI!${random}9`;
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

  const clientBaseUrl = (process.env.CLIENT_BASE_URL || "http://localhost:5173").replace(/\/+$/, "");
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

  const facilities = await Facility.find().sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
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

  await User.deleteOne({ _id: facility.user_id });
  await Facility.deleteOne({ _id: facility._id });

  res.status(200).json({
    success: true,
    message: "Facility deleted successfully.",
  });
});
