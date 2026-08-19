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
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

const snfPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    website: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    zip_code: { type: String, default: "", trim: true },
    pricing: { type: String, default: "", trim: true },
    services: { type: [String], default: [] },
    amenities: { type: [String], default: [] },
    care_levels: { type: [String], default: ["Skilled Nursing"] },
    units: { type: Number, default: 0, min: 0 },
    occupancy: { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] },
    partnershipType: { type: String, default: "Skilled Nursing", trim: true },
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

/** Older schema made referralCode unique on scans; multiple users must be able to scan the same QR. */
export async function ensureSnfReferralIndexes() {
  const collection = SnfReferral.collection;
  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch {
    return;
  }

  for (const idx of indexes) {
    const keys = Object.keys(idx.key || {});
    if (keys.length === 1 && keys[0] === "referralCode" && idx.unique) {
      try {
        await collection.dropIndex(idx.name);
      } catch {
        // Index may already have been removed.
      }
    }
  }

  try {
    await collection.createIndex({ referralCode: 1 });
  } catch {
    // Non-unique index may already exist.
  }
}

export default mongoose.model("SnfPartner", snfPartnerSchema);
