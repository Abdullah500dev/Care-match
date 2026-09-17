import validator from "email-validator";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

import catchAsyncError from "../middleware/catchAsyncErrors.js";
import sendMail from "../utils/sendMail.js";
import { greetingNameForEmail } from "../utils/greetingNameForEmail.js";
import { resolveClientBaseUrl } from "../utils/resolveClientBaseUrl.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendToken from "../utils/jwtToken.js";
import User from "../models/userModel.js";
import Facility from "../models/facilityModel.js";
import SnfPartner from "../models/snfPartnerModel.js";
import { RESET_PASSWORD_TOKEN_MINUTES } from "../config/authConstants.js";

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const emailMatchFilter = (email) => ({
  email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
});

// Register user
export const register = catchAsyncError(async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, role: roleRaw } = req.body;
    const role = roleRaw === "facility" ? "facility" : "user";
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!validator.validate(normalizedEmail)) {
      return next(new ErrorHandler("Invalid email", 400));
    }

    if (password !== confirmPassword) {
      return next(
        new ErrorHandler("Password and Confirm Password does not match!", 400),
      );
    }

    // Check for unique email
    const existingUser = await User.findOne(emailMatchFilter(normalizedEmail));
    if (existingUser) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    // Create user with selected account role (user or facility)
    const user = new User({
      name,
      email: normalizedEmail,
      password,
      user_type: "user",
      role,
    });

    await user.save();

    // Facility accounts get a starter profile so /facility dashboard can load.
    if (role === "facility") {
      try {
        await Facility.create({
          name: String(name || "").trim() || "My Facility",
          email: normalizedEmail,
          phone: "0000000000",
          address: "To be updated",
          care_levels: ["Assisted Living"],
          user_id: user._id,
          created_by: user._id,
        });
      } catch (facilityError) {
        await User.deleteOne({ _id: user._id });
        return next(
          new ErrorHandler(
            facilityError?.message || "Unable to create facility profile",
            400,
          ),
        );
      }
    }

    // Generate 6-digit verification code
    const verificationCode = user.getVerificationCode(15);
    await user.save({ validateBeforeSave: false });

    // Helps local debugging when SMTP is flaky / emails land in spam.
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[register] verification code for ${user.email}: ${verificationCode}`,
      );
    }

    try {
      const clientBaseUrl = resolveClientBaseUrl(req);
      const activationUrl = `${clientBaseUrl}/register?activate=1&copy=1&email=${encodeURIComponent(
        user.email,
      )}&code=${encodeURIComponent(verificationCode)}`;
      await sendMail({
        email: user.email,
        subject: "Activate your account – your verification code",
        template: "activation-mail.ejs",
        data: {
          user: { name: greetingNameForEmail(user) },
          verificationCode,
          expiresInMinutes: 15,
          activationUrl,
        },
      });

      const payload = {
        success: true,
        message: `Please check your email: ${user.email} for your 6-digit verification code to activate your account!`,
        role,
      };
      // Only expose the code outside production so signup can continue during SMTP issues.
      if (process.env.NODE_ENV !== "production") {
        payload.verificationCode = verificationCode;
        payload.activationUrl = activationUrl;
      }
      res.status(201).json(payload);
    } catch (error) {
      console.error("[register] verification email failed:", error?.message || error);
      // Rollback user (+ facility stub) if email fails
      if (role === "facility") {
        await Facility.deleteOne({ user_id: user._id });
      }
      await User.deleteOne({ _id: user._id });
      const detail =
        process.env.NODE_ENV !== "production"
          ? ` ${error?.message || ""}`.trim()
          : "";
      return next(
        new ErrorHandler(
          `Unable to send verification email.${detail ? ` ${detail}` : ""}`.trim(),
          400,
        ),
      );
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Activate user with 6-digit code
export const activateUser = catchAsyncError(async (req, res, next) => {
  try {
    const rawEmail = String(req.body?.email || "").trim().toLowerCase();
    const normalizedCode = String(req.body?.code || "")
      .replace(/\D/g, "")
      .trim();

    if (!rawEmail || !normalizedCode) {
      return next(
        new ErrorHandler("Email and verification code are required", 400),
      );
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return next(
        new ErrorHandler("Verification code must be exactly 6 digits", 400),
      );
    }

    const hashedCode = crypto
      .createHash("sha256")
      .update(normalizedCode)
      .digest("hex");

    // Case-insensitive email match (Gmail etc. treat address case as identical)
    const user = await User.findOne(emailMatchFilter(rawEmail));

    if (!user) {
      return next(new ErrorHandler("Invalid email or verification code", 400));
    }

    if (!user.token || !user.tokenExpire) {
      return next(
        new ErrorHandler(
          "No active verification code. Please tap Resend to get a new code.",
          400,
        ),
      );
    }

    if (new Date(user.tokenExpire).getTime() < Date.now()) {
      return next(
        new ErrorHandler(
          "Verification code has expired. Please tap Resend to get a new code.",
          400,
        ),
      );
    }

    if (user.token !== hashedCode) {
      return next(
        new ErrorHandler(
          "Incorrect verification code. After you resend, only the newest code works — check the latest email.",
          400,
        ),
      );
    }

    user.is_verified = true;
    user.email = rawEmail;
    user.token = undefined;
    user.tokenExpire = undefined;
    user.tokenValidityInMinutes = undefined;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Account activated successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Login user
export const login = catchAsyncError(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Please enter email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }

    if (!user.is_verified) {
      return next(
        new ErrorHandler(
          "Please verify your email to access your account!",
          403,
        ),
      );
    }

    if (user.role === "user") {
      const linkedSnf = await SnfPartner.exists({ facilityUserId: user._id });
      if (linkedSnf) {
        user.role = "snf";
        await user.save({ validateBeforeSave: false });
      }
    }

    sendToken(user, 200, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Logout user
export const logoutUser = catchAsyncError(async (req, res, next) => {
  try {
    res.cookie("access_token", "", {
      expires: new Date(0),
      sameSite: "none",
      secure: true,
    });

    res.cookie("refresh_token", "", {
      expires: new Date(0),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Update access token
export const updateAccessToken = catchAsyncError(async (req, res, next) => {
  try {
    const refresh_token = req.headers["refresh-token"];

    if (!refresh_token) {
      return next(new ErrorHandler("Refresh token is required", 400));
    }

    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN);

    if (!decoded) {
      return next(new ErrorHandler("Could not refresh token", 400));
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ErrorHandler("User not found", 400));
    }

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN || "",
      { expiresIn: "7d" },
    );

    res.cookie("access_token", accessToken, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    res.status(200).json({
      status: "success",
      accessToken,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get user info
export const getUserInfo = catchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Update user info (name + family care profile fields / optional uploads)
export const updateUserInfo = catchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const {
      name,
      bio,
      medical_issues,
      care_background,
      desired_services,
      desired_amenities,
      keep_document_paths,
    } = req.body || {};

    if (name != null && String(name).trim()) {
      user.name = String(name).trim();
    }

    const isFamilyUser =
      user.role === "user" &&
      !["admin", "authenticator", "moderator"].includes(user.user_type);

    if (isFamilyUser) {
      if (bio != null) {
        user.bio = String(bio).trim().slice(0, 2000);
      }
      if (medical_issues != null) {
        user.medical_issues = String(medical_issues).trim().slice(0, 4000);
      }
      if (care_background != null) {
        user.care_background = String(care_background).trim().slice(0, 4000);
      }

      const toStringList = (value) => {
        if (Array.isArray(value)) {
          return value
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 40);
        }
        if (value == null) return null;
        if (value === "") return [];
        return String(value)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 40);
      };

      if (Object.prototype.hasOwnProperty.call(req.body || {}, "desired_services")) {
        const services = toStringList(desired_services);
        if (services) user.desired_services = services;
      }

      if (Object.prototype.hasOwnProperty.call(req.body || {}, "desired_amenities")) {
        const amenities = toStringList(desired_amenities);
        if (amenities) user.desired_amenities = amenities;
      }

      const previousDocs = Array.isArray(user.care_documents)
        ? user.care_documents
        : [];
      const uploaded = Array.isArray(req.files) ? req.files : [];
      const shouldUpdateDocuments =
        uploaded.length > 0 ||
        Object.prototype.hasOwnProperty.call(req.body || {}, "keep_document_paths");

      if (shouldUpdateDocuments) {
        let keepPaths = previousDocs.map((doc) => doc.path).filter(Boolean);

        if (keep_document_paths != null && keep_document_paths !== "") {
          try {
            const parsed =
              typeof keep_document_paths === "string"
                ? JSON.parse(keep_document_paths)
                : keep_document_paths;
            if (Array.isArray(parsed)) {
              const allowed = new Set(previousDocs.map((doc) => doc.path));
              keepPaths = parsed
                .map((p) => String(p || "").trim())
                .filter((p) => allowed.has(p));
            }
          } catch {
            // keep previous paths on parse failure
          }
        } else if (
          Object.prototype.hasOwnProperty.call(req.body || {}, "keep_document_paths")
        ) {
          keepPaths = [];
        }

        const keptDocs = previousDocs.filter((doc) => keepPaths.includes(doc.path));
        const removedDocs = previousDocs.filter((doc) => !keepPaths.includes(doc.path));

        for (const doc of removedDocs) {
          try {
            const relative = String(doc.path || "").replace(/^\//, "");
            if (relative.startsWith("uploads/user-care/")) {
              const absolute = path.join(process.cwd(), relative);
              if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
            }
          } catch {
            // ignore file cleanup errors
          }
        }

        const newDocs = uploaded.map((file) => ({
          path: `/uploads/user-care/${file.filename}`,
          originalName: file.originalname || file.filename,
          mimeType: file.mimetype || "",
          size: file.size || 0,
          uploadedAt: new Date(),
        }));

        user.care_documents = [...keptDocs, ...newDocs].slice(0, 12);
        user.markModified("care_documents");
      }

      user.markModified("desired_services");
      user.markModified("desired_amenities");
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Update user password
export const updatePassword = catchAsyncError(async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return next(new ErrorHandler("Please enter old and new password", 400));
    }

    const user = await User.findById(req.user?.id).select("+password");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const isPasswordMatch = await user.comparePassword(oldPassword);

    if (!isPasswordMatch) {
      return next(new ErrorHandler("Invalid old password", 400));
    }

    user.password = newPassword;
    await user.save();

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Send reset password link
export const forgotPassword = catchAsyncError(async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorHandler("User not found with this email", 404));
    }

    const resetToken = await user.getToken(RESET_PASSWORD_TOKEN_MINUTES);
    await user.save({ validateBeforeSave: false });

    const clientBase = resolveClientBaseUrl(req);
    const resetLink = `${clientBase}/reset-password?token=${resetToken}`;

    try {
      await sendMail({
        email: user.email,
        subject: "Password Reset Link",
        template: "reset-password.ejs",
        data: {
          user: { name: greetingNameForEmail(user) },
          resetLink,
          expiresInMinutes: RESET_PASSWORD_TOKEN_MINUTES,
        },
      });

      res.status(200).json({
        success: true,
        message: "Password reset link sent to your email!",
        expiresInMinutes: RESET_PASSWORD_TOKEN_MINUTES,
      });
    } catch (error) {
      user.token = undefined;
      user.tokenExpire = undefined;
      user.tokenValidityInMinutes = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("[forgotPassword] reset email send failed:", error?.message || error);
      return next(new ErrorHandler("Failed to send reset email", 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Reset password with token
export const resetPassword = catchAsyncError(async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return next(
        new ErrorHandler(
          "Token, new password and confirm password are required",
          400,
        ),
      );
    }

    if (newPassword !== confirmPassword) {
      return next(
        new ErrorHandler("Password and confirm password do not match", 400),
      );
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      token: hashedToken,
      tokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorHandler("Invalid or expired reset token", 400));
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.token = undefined;
    user.tokenExpire = undefined;
    user.tokenValidityInMinutes = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Resend verification token
export const resendVerificationToken = catchAsyncError(
  async (req, res, next) => {
    try {
      const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();

      if (!normalizedEmail) {
        return next(new ErrorHandler("Email is required", 400));
      }

      const user = await User.findOne(emailMatchFilter(normalizedEmail));

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (user.is_verified) {
        return next(new ErrorHandler("User is already verified", 400));
      }

      // Generate new 6-digit verification code (invalidates any previous code)
      const verificationCode = user.getVerificationCode(15);
      user.email = normalizedEmail;
      await user.save({ validateBeforeSave: false });

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[resend] verification code for ${user.email}: ${verificationCode}`,
        );
      }

      try {
        const clientBaseUrl = resolveClientBaseUrl(req);
        const activationUrl = `${clientBaseUrl}/register?activate=1&copy=1&email=${encodeURIComponent(
          user.email,
        )}&code=${encodeURIComponent(verificationCode)}`;
        await sendMail({
          email: user.email,
          subject: "Activate your account – your verification code",
          template: "activation-mail.ejs",
          data: {
            user: { name: greetingNameForEmail(user) },
            verificationCode,
            expiresInMinutes: 15,
            activationUrl,
          },
        });

        const payload = {
          success: true,
          message:
            "Verification code sent to your email! Older codes no longer work — use the newest email.",
        };
        if (process.env.NODE_ENV !== "production") {
          payload.verificationCode = verificationCode;
        }
        res.status(200).json(payload);
      } catch (error) {
        console.error("[resend] verification email failed:", error?.message || error);
        user.token = undefined;
        user.tokenExpire = undefined;
        user.tokenValidityInMinutes = undefined;
        await user.save({ validateBeforeSave: false });
        const detail =
          process.env.NODE_ENV !== "production"
            ? ` ${error?.message || ""}`.trim()
            : "";
        return next(
          new ErrorHandler(
            `Failed to send verification email.${detail ? ` ${detail}` : ""}`.trim(),
            500,
          ),
        );
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// Check if a registered email has been activated yet.
export const getActivationStatus = catchAsyncError(async (req, res, next) => {
  try {
    const email = String(req.query?.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    const user = await User.findOne({ email }).select("is_verified");
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      isVerified: Boolean(user.is_verified),
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Toggle Favorite Facility
export const toggleFavorite = catchAsyncError(async (req, res, next) => {
  try {
    const { facilityId, facilityData } = req.body;
    const userId = req.user?.id;

    if (!facilityId) {
      return next(new ErrorHandler("Facility ID is required", 400));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const safeId = String(facilityId);
    const index = user.saved_facilities.indexOf(safeId);

    if (index === -1) {
      user.saved_facilities.push(safeId);
      if (facilityData && typeof facilityData === "object") {
        const alreadyStored = (user.saved_facility_details || []).some(
          (d) => String(d?.facilityId || d?.id || "") === safeId
        );
        if (!alreadyStored) {
          if (!user.saved_facility_details) user.saved_facility_details = [];
          user.saved_facility_details.push({ ...facilityData, facilityId: safeId, savedAt: new Date() });
        }
      }
    } else {
      user.saved_facilities.splice(index, 1);
      user.saved_facility_details = (user.saved_facility_details || []).filter(
        (d) => String(d?.facilityId || d?.id || "") !== safeId
      );
    }

    user.markModified("saved_facility_details");
    await user.save();

    res.status(200).json({
      success: true,
      message: index === -1 ? "Added to favorites" : "Removed from favorites",
      favorites: user.saved_facilities,
      facilityDetails: user.saved_facility_details,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get Favorite Facilities
export const getFavorites = catchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      favorites: user.saved_facilities || [],
      facilityDetails: user.saved_facility_details || [],
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});
