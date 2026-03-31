import Joi from "joi";

const stringOrArray = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim()),
  Joi.string().trim()
);

const joiCreateFacilitySchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
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
