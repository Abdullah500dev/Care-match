import Joi from "joi";
import { normalizeFacilityWebsite } from "../normalizeFacilityWebsite.js";

const stringOrArray = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim()),
  Joi.string().trim()
);

const normalizeZipInput = (value) => String(value || "").replace(/\D/g, "").slice(0, 5);

const joiZipCode = Joi.string()
  .trim()
  .required()
  .custom((value, helpers) => {
    const zip = normalizeZipInput(value);
    if (zip.length !== 5) {
      return helpers.error("any.invalid");
    }
    return zip;
  })
  .messages({
    "any.invalid": "ZIP code must be a 5-digit US postal code",
    "any.required": "ZIP code is required",
    "string.empty": "ZIP code is required",
  });

const joiWebsite = Joi.string()
  .trim()
  .optional()
  .allow("")
  .custom((value, helpers) => {
    if (!value) return "";
    const normalized = normalizeFacilityWebsite(value);
    if (!normalized) {
      return helpers.error("any.invalid");
    }
    return normalized;
  })
  .messages({
    "any.invalid": "Website must be a valid URL (e.g. https://example.com)",
  });

const joiCreateFacilitySchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  zip_code: joiZipCode,
  website: joiWebsite,
  specialty: stringOrArray.optional(),
  description: Joi.string().trim().optional().allow(""),
  services: stringOrArray.optional(),
  amenities: stringOrArray.optional(),
  care_levels: stringOrArray.optional(),
  pricing: Joi.string().trim().optional().allow(""),
  images: Joi.any().optional(),
  units: Joi.number().min(0).optional(),
  occupancy: Joi.number().min(0).optional(),
  active_leads: Joi.number().min(0).optional(),
});

const joiUpdateFacilitySchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  zip_code: joiZipCode,
  website: joiWebsite,
  specialty: stringOrArray.optional(),
  description: Joi.string().trim().optional().allow(""),
  services: stringOrArray.optional(),
  amenities: stringOrArray.optional(),
  care_levels: stringOrArray.optional(),
  pricing: Joi.string().trim().optional().allow(""),
  images: Joi.any().optional(),
  keep_image_paths: Joi.string().optional().allow(""),
  units: Joi.number().min(0).optional(),
  occupancy: Joi.number().min(0).optional(),
  active_leads: Joi.number().min(0).optional(),
});

export { joiCreateFacilitySchema, joiUpdateFacilitySchema };
