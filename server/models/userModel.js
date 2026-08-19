import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter name"],
    },
    email: {
      type: String,
      required: [true, "Please enter an email"],
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email address",
      ],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
      select: false,
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    slug: {
      type: String,
    },
    about_us: {
      type: String,
    },
    is_blocked: {
      type: Boolean,
      default: false,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    is_visible: {
      type: Boolean,
      default: true,
    },
    user_type: {
      type: String,
      enum: ["user", "admin", "authenticator", "moderator"],
      default: "user",
    },
    role: {
      type: String,
      enum: ["user", "facility", "snf", "admin"],
      default: "user",
    },
    phone: {
      type: String,
    },
    profile_picture: {
      type: String,
    },
    cover_picture: {
      type: String,
    },
    country: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    token: String,
    tokenValidityInMinutes: String,
    tokenExpire: Date,
    saved_facilities: {
      type: [String],
      default: [],
    },
    saved_facility_details: {
      type: [Object],
      default: [],
    },
    scanned_snfs: {
      type: [
        {
          partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SnfPartner",
          },
          scannedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Hash Password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// sign access token
userSchema.methods.SignAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN || "", {
    expiresIn: "7d",
  });
};

// sign refresh token
userSchema.methods.SignRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN || "", {
    expiresIn: "3d",
  });
};

// Generate 6-digit verification code for email activation
userSchema.methods.getVerificationCode = function (minutesToExpire = 15) {
  const code = String(crypto.randomInt(100000, 999999));
  this.token = crypto.createHash("sha256").update(code).digest("hex");
  this.tokenValidityInMinutes = minutesToExpire;
  this.tokenExpire = Date.now() + minutesToExpire * 60 * 1000;
  return code;
};

// Generate token for password reset (kept for reset flow)
userSchema.methods.getToken = function (minutesToExpire = 15) {
  const userToken = crypto.randomBytes(20).toString("hex");
  this.token = crypto.createHash("sha256").update(userToken).digest("hex");
  this.tokenValidityInMinutes = minutesToExpire;
  this.tokenExpire = Date.now() + minutesToExpire * 60 * 1000;
  return userToken;
};

const User = mongoose.model("User", userSchema);

export default User;
