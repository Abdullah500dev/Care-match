import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../config/env.js";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please enter an email"],
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email address",
      ],
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, "Please enter your first name"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Please enter your last name"],
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
    },
    resetPasswordToken: {
      type: String,
    },
    termsAndConditionsAccepted: {
      type: Boolean,
      default: true,
    },
    resetPasswordExpire: {
      type: Date,
    },
    token: String,
    tokenValidityInMinutes: String,
    tokenExpire: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};
userSchema.methods.getTokenExpiry = () => Date.now() + 24 * 60 * 60 * 1000;
userSchema.methods.getToken = function (minutesToExpire = 15) {
  const userToken = crypto.randomBytes(20).toString("hex");
  this.token = crypto.createHash("sha256").update(userToken).digest("hex");
  this.tokenValidityInMinutes = minutesToExpire;
  this.tokenExpire = Date.now() + minutesToExpire * 60 * 1000;
  return userToken;
};

userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
});

export default mongoose.model("User", userSchema);
