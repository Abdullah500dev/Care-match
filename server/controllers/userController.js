import passport from "passport";

import catchAsyncError from "../middlewares/catchAsyncErrors.js";
import sendToken from "../utils/jwtToken.js";
import User from "../models/userModel.js";

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

const logout = catchAsyncError(async (_, res) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .send({ success: true, message: "Logged out successfully!" });
});

const updateUserDetails = catchAsyncError(async (req, res) => {
  const newUserData = {};
  if (req.body.firstName !== undefined)
    newUserData.firstName = req.body.firstName;
  if (req.body.lastName !== undefined) newUserData.lastName = req.body.lastName;

  try {
    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    sendToken(user, 200, res);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

const getUserDetails = catchAsyncError(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("email firstName lastName")
    .exec();

  if (!user) {
    return res.status(404).send({ error: "User doesn't exist!" });
  }

  res.status(200).json({
    success: true,
    user,
  });
});

const updatePassword = catchAsyncError(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).send({ error: "User doesn't exist!" });
  }

  const isMatched = await user.authenticate(req.body.oldPassword);

  if (!isMatched.user) {
    return res.status(400).send({ error: "Old password is incorrect!" });
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return res
      .status(400)
      .send({ error: "Password and Confirm Password does not match!" });
  }

  if (req.body.oldPassword === req.body.newPassword) {
    return res
      .status(400)
      .send({ error: "Old Password and New Password can not be same!" });
  }

  await user.setPassword(req.body.newPassword);
  await user.save();
  sendToken(user, 200, res);
});

const getUserAccountStatus = catchAsyncError(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("isVerified isBlocked")
    .exec();

  if (!user) {
    return res.status(404).send({ error: "User doesn't exist!" });
  }

  res.status(200).json({
    success: true,
    user,
  });
});

export default {
  logout,
  updateUserDetails,
  getUserDetails,
  updatePassword,
  getUserAccountStatus,
};
