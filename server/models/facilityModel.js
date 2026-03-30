import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Facility name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Facility email is required"],
      trim: true,
      lowercase: true,
      unique: true,
    },
    phone: {
      type: String,
      required: [true, "Facility phone number is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Facility address is required"],
      trim: true,
    },
    services: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    care_levels: {
      type: [String],
      default: [],
    },
    pricing: {
      type: String,
      default: "",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Facility = mongoose.model("Facility", facilitySchema);

export default Facility;
