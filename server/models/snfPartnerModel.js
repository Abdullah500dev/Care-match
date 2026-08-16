import mongoose from "mongoose";

const snfReferralSchema = new mongoose.Schema(
  {
    referralCode: { type: String, required: true, index: true },
    snfPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SnfPartner",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Checked In"],
      default: "Checked In",
    },
    checkedInAt: { type: Date, default: Date.now },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const snfPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    partnershipType: { type: String, default: "", trim: true },
    referralCode: { type: String, required: true, unique: true, index: true },
    facilityUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const SnfReferral = mongoose.model("SnfReferral", snfReferralSchema);
export default mongoose.model("SnfPartner", snfPartnerSchema);
