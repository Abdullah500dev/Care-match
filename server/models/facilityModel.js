import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema(
  {
    is_external: {
      type: Boolean,
      default: false,
    },
    source_platform: {
      type: String,
      default: "",
      trim: true,
    },
    external_ref: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Facility name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: function requiredEmail() {
        return !this.is_external;
      },
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
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
    website: {
      type: String,
      default: "",
      trim: true,
    },
    specialty: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
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
    external_data: {
      provider_name: {
        type: String,
        default: "",
        trim: true,
      },
      city: {
        type: String,
        default: "",
        trim: true,
      },
      state: {
        type: String,
        default: "",
        trim: true,
      },
      zip_code: {
        type: String,
        default: "",
        trim: true,
      },
      phone_number: {
        type: String,
        default: "",
        trim: true,
      },
      overall_rating: {
        type: Number,
        default: null,
      },
      total_fines_amount: {
        type: Number,
        default: null,
      },
      provider_url: {
        type: String,
        default: "",
        trim: true,
      },
    },

    units: {
      type: Number,
      default: 0,
      min: 0,
    },
    occupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    active_leads: {
      type: Number,
      default: 0,
      min: 0,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function requiredCreator() {
        return !this.is_external;
      },
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function requiredFacilityUser() {
        return !this.is_external;
      },
    },
  },
  {
    timestamps: true,
  }
);

const Facility = mongoose.model("Facility", facilitySchema);

export default Facility;