import validator from "email-validator";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import catchAsyncError from "../middleware/catchAsyncErrors.js";
import sendMail from "../utils/sendMail.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendToken from "../utils/jwtToken.js";
import User from "../models/userModel.js";

// Register user
export const register = catchAsyncError(async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!validator.validate(email)) {
      return next(new ErrorHandler("Invalid email", 400));
    }

    if (password !== confirmPassword) {
      return next(
        new ErrorHandler("Password and Confirm Password does not match!", 400)
      );
    }

    // Check for unique email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    // Create user directly
    const user = new User({
      name,
      email,
      password,
    });

    await user.save();

    // Generate 6-digit verification code
    const verificationCode = user.getVerificationCode(15);
    await user.save({ validateBeforeSave: false });

    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account – your verification code",
        template: "activation-mail.ejs",
        data: {
          user: { name: user.name },
          verificationCode,
          expiresInMinutes: 15,
        },
      });

      res.status(201).json({
        success: true,
        message: `Please check your email: ${user.email} for your 6-digit verification code to activate your account!`,
      });
    } catch (error) {
      // Rollback user creation if email fails
      await User.deleteOne({ _id: user._id });
      return next(new ErrorHandler("Unable to send verification email", 400));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Activate user with 6-digit code
export const activateUser = catchAsyncError(async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return next(
        new ErrorHandler("Email and verification code are required", 400)
      );
    }

    const hashedCode = crypto.createHash("sha256").update(String(code)).digest("hex");

    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorHandler("Invalid email or verification code", 400));
    }

    if (user.token !== hashedCode || !user.tokenExpire || user.tokenExpire < Date.now()) {
      return next(new ErrorHandler("Invalid or expired verification code", 400));
    }

    user.is_verified = true;
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
          403
        )
      );
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
      { expiresIn: "7d" }
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

// Update user info
export const updateUserInfo = catchAsyncError(async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    res.status(201).json({
      success: true,
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

    // Generate reset token
    const resetToken = await user.getToken(15); // 15 minutes validity
    await user.save({ validateBeforeSave: false });

    // Send reset email
    const resetLink = `${process.env.CLIENT_BASE_URL}/api/auth/reset-password?token=${resetToken}`;

    try {
      await sendMail({
        email: user.email,
        subject: "Password Reset Link",
        template: "reset-password.ejs",
        data: {
          user: { name: user.name },
          resetLink: resetLink,
        },
      });

      res.status(200).json({
        success: true,
        message: "Password reset link sent to your email!",
      });
    } catch (error) {
      user.token = undefined;
      user.tokenExpire = undefined;
      user.tokenValidityInMinutes = undefined;
      await user.save({ validateBeforeSave: false });
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
          400
        )
      );
    }

    if (newPassword !== confirmPassword) {
      return next(
        new ErrorHandler("Password and confirm password do not match", 400)
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
      const { email } = req.body;

      if (!email) {
        return next(new ErrorHandler("Email is required", 400));
      }

      const user = await User.findOne({ email });

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (user.is_verified) {
        return next(new ErrorHandler("User is already verified", 400));
      }

      // Generate new 6-digit verification code
      const verificationCode = user.getVerificationCode(15);
      await user.save({ validateBeforeSave: false });

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account – your verification code",
          template: "activation-mail.ejs",
          data: {
            user: { name: user.name },
            verificationCode,
            expiresInMinutes: 15,
          },
        });

        res.status(200).json({
          success: true,
          message: "Verification code sent to your email!",
        });
      } catch (error) {
        user.token = undefined;
        user.tokenExpire = undefined;
        user.tokenValidityInMinutes = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler("Failed to send verification email", 500));
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
