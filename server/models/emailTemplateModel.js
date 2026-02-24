import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

emailTemplateSchema.index(
  { name: 1 },
  {
    unique: true,
  }
);

emailTemplateSchema.index(
  { name: "text", subject: "text" },
  { weights: { name: 2, subject: 1 } }
);

export default mongoose.model("EmailTemplate", emailTemplateSchema);
