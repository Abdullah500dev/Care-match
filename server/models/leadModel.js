import mongoose from "mongoose";

const LEAD_STATUSES = [
  "New",
  "Tour Scheduled",
  "Contacted",
  "Waitlist",
  "Closed",
];

const leadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
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
      lowercase: true,
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
    careType: {
      type: String,
      default: "",
      trim: true,
    },
    destinationUrl: {
      type: String,
      default: "",
      trim: true,
    },
    sourcePlatform: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New",
    },
    /** Becomes true when any linked explore-notify email is opened */
    emailOpened: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailOpenedAt: {
      type: Date,
      default: null,
    },
    emailOpenCount: {
      type: Number,
      default: 0,
    },
    isRemoved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

export const LEAD_STATUS_VALUES = LEAD_STATUSES;
export default mongoose.model("Lead", leadSchema);
