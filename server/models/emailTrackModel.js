import mongoose from "mongoose";

const emailTrackSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["explore_click"],
      default: "explore_click",
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: {
      type: String,
      default: "",
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
    },
    facilityId: {
      type: String,
      default: "",
      trim: true,
    },
    facilityName: {
      type: String,
      default: "",
      trim: true,
    },
    destinationUrl: {
      type: String,
      default: "",
      trim: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    firstOpenedAt: {
      type: Date,
      default: null,
    },
    lastOpenedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("EmailTrack", emailTrackSchema);
