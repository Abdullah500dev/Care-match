import passport from "passport";
import validator from "email-validator";
import crypto from "crypto";

import catchAsyncError from "../middlewares/catchAsyncErrors.js";
import sendToken from "../utils/jwtToken.js";
import sendEmail from "../config/mail.js";
import User from "../models/userModel.js";
import emailTemplateController from "./emailTemplateController.js";
import helpers from "../utils/helpers.js";
import config from "../config/env.js";

passport.use(User.createStrategy());

passport.serializeUser(
  User.serializeUser(function (user, done) {
    done(null, user.id);
  })
);

passport.deserializeUser(
  User.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  })
);

const register = catchAsyncError(async (req, res) => {
  if (!validator.validate(req.body.email)) {
    return res.status(400).send({ error: "Invalid email" });
  }

  if (req.body.password !== req.body.confirmPassword) {
    return res
      .status(400)
      .send({ error: "Password and Confirm Password does not match!" });
  }

  User.register(
    new User({
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
    }),
    req.body.password,
    async function (err, user) {
      if (err) {
        res.status(400).send({ error: err });
      } else {
        const emailTemplate = await emailTemplateController.getTemplateByName(
          "account-verification"
        );

        if (!emailTemplate) {
          return res.status(404).json({
            status: "fail",
            message: "Email Template not found",
          });
        }

        const verificationToken = await user.getToken(24 * 60);
        await user.save({ validateBeforeSave: false });

        const verificationLink = `${config.CLIENT_BASE_URL}/auth/token/verify/${verificationToken}?type=account-verification`;

        const emailContent = helpers.replaceDynamicFields(emailTemplate.body, {
          "{{user_full_name}}": `${req.body.firstName} ${req.body.lastName}`,
          "{{token_link}}": verificationLink,
        });

        try {
          await sendEmail(
            {
              host: config.SMTP_HOST,
              port: config.SMTP_PORT,
              user: config.SMTP_USER,
              pass: config.SMTP_PASS,
              from: config.SMTP_USER,
            },
            {
              to: req.body.email,
              subject: emailTemplate.subject,
              html: emailContent,
            }
          );
        } catch (error) {
          return res.status(500).send({ error: error.message });
        }

        passport.authenticate("local")(req, res, function () {
          sendToken(user, 200, res);
        });
      }
    }
  );
});

const login = catchAsyncError(async (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return res
        .status(500)
        .send({ error: "An error occurred during authentication." });
    }

    if (!user) {
      return res
        .status(401)
        .send({ error: info ? info.message : "Invalid email or password." });
    }

    req.login(user, { session: false }, (err) => {
      if (err) {
        return res.status(400).send({ error: err });
      }
      sendToken(user, 200, res);
    });
  })(req, res, next);
});

const forgotPassword = catchAsyncError(async (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: "User Email is required." });
  }

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).send({ error: "Incorrect Email!" });
  }

  const emailTemplate = await emailTemplateController.getTemplateByName(
    "reset-password"
  );
  if (!emailTemplate) {
    return res.status(404).json({
      status: "fail",
      message: "Email Template not found",
    });
  }

  const resetToken = await user.getToken(15);
  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${config.CLIENT_BASE_URL}/auth/token/verify/${resetToken}?type=reset-password`;

  const emailContent = helpers.replaceDynamicFields(emailTemplate.body, {
    "{{token_link}}": resetPasswordUrl,
  });

  try {
    await sendEmail(
      {
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
        from: config.SMTP_USER,
      },
      {
        to: req.body.email,
        subject: emailTemplate.subject,
        html: emailContent,
      }
    );

    res.status(200).json({
      success: true,
      message: "Email Sent Successfully!",
    });
  } catch (error) {
    user.token = undefined;
    user.tokenValidityInMinutes = undefined;
    user.tokenExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(500).send({ error: error.message });
  }
});

const verifyToken = catchAsyncError(async (req, res, next) => {
  if (!req.params.token) {
    return res.status(400).json({ error: "Verification token is required." });
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    token: hashedToken,
    tokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      res
        .status(400)
        .send({ error: "Verification token is invalid or has been expired!" })
    );
  }

  res.status(200).json({
    success: true,
  });
});

const resetPassword = catchAsyncError(async (req, res, next) => {
  if (!req.params.token) {
    return res.status(400).json({ error: "Verification token is required." });
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    token: hashedToken,
    tokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      res
        .status(400)
        .send({ error: "Reset password token is invalid or has been expired!" })
    );
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return res
      .status(400)
      .send({ error: "Password and Confirm Password does not match!" });
  }

  await user.setPassword(req.body.newPassword);
  user.restPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendToken(user, 200, res);
});

const regenerateAndSendToken = async (user, type, res) => {
  const emailTemplate = await emailTemplateController.getTemplateByName(
    "account-verification"
  );
  if (!emailTemplate) {
    return res.status(404).json({
      status: "fail",
      message: "Email Template not found",
    });
  }

  const newToken = await user.getToken(
    user.tokenValidityInMinutes || type === "reset-password"
      ? 15
      : type === "account-verification"
      ? 24 * 60
      : 15
  );

  await user.save({ validateBeforeSave: false });

  const tokenLink = `${config.CLIENT_BASE_URL}/auth/token/verify/${newToken}?type=${type}`;

  const emailContent = helpers.replaceDynamicFields(emailTemplate.body, {
    "{{user_full_name}}": `${user.firstName} ${user.lastName}`,
    "{{token_link}}": tokenLink,
  });

  await sendEmail(
    {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
      from: config.SMTP_USER,
    },
    {
      to: user.email,
      subject: emailTemplate.subject,
      html: emailContent,
    }
  );

  return res.status(200).json({ message: "Token sent." });
};

const resendVerificationToken = catchAsyncError(async (req, res) => {
  const { type } = req.query;

  if (type !== "reset-password" && type !== "account-verification") {
    return res.status(400).json({ error: "Invalid token type." });
  }

  let user;

  if (req.params.token) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    user = await User.findOne({ token: hashedToken });

    if (user && user.tokenExpire < Date.now()) {
      return await regenerateAndSendToken(user, type, res);
    }

    if (!user) {
      if (!req.body.email) {
        return res
          .status(400)
          .json({ error: "Invalid token and no email provided." });
      }
    } else {
      return res.status(400).json({
        error:
          "The token is still valid. Please use the original link or wait until it expires.",
      });
    }
  }

  if (!user && req.body.email) {
    user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ error: "No user found with that email." });
    }

    return await regenerateAndSendToken(user, type, res);
  }

  return res.status(400).json({ error: "Token or email required." });
});

const verifyUserAccount = catchAsyncError(async (req, res, next) => {
  if (req.query.type !== "account-verification") {
    return res.status(400).json({ error: "Invalid token type." });
  }

  if (!req.params.token) {
    return res.status(400).json({ error: "Verification token is required." });
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    token: hashedToken,
    tokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      res
        .status(400)
        .send({ error: "Verification token is invalid or has been expired!" })
    );
  }

  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();

    const emailTemplate = await emailTemplateController.getTemplateByName(
      "welcome-email"
    );

    if (!emailTemplate) {
      return res.status(404).json({
        status: "fail",
        message: "Email Template not found",
      });
    }

    const emailContent = helpers.replaceDynamicFields(emailTemplate.body, {
      "{{user_full_name}}": `${user.firstName} ${user.lastName}`,
    });

    try {
      await sendEmail(
        {
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
          from: config.SMTP_USER,
        },
        {
          to: user.email,
          subject: emailTemplate.subject,
          html: emailContent,
        }
      );
    } catch (error) {
      return res.status(500).send({ error: error.message });
    }
  }

  const filteredUser = {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    __v: user.__v,
    token: user.token,
    tokenExpire: user.tokenExpire,
  };

  res.status(200).json({
    user: filteredUser,
    success: true,
  });
});

export default {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyToken,
  resendVerificationToken,
  verifyUserAccount,
};
