import mongoose from "mongoose";

const LEAD_STATUSES = [
  "New",
  "Email Opened",
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
    facilityAddress: {
      type: String,
      default: "",
      trim: true,
    },
    facilityPhone: {
      type: String,
      default: "",
      trim: true,
    },
    facilityEmail: {
      type: String,
      default: "",
      trim: true,
    },
    facilityZip: {
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
    /** Becomes true only when recipient taps Confirm in the email (not the tracking pixel). */
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
    /** True only after intentional confirm-link open — pixels do not set this. */
    confirmedOpen: {
      type: Boolean,
      default: false,
      index: true,
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
