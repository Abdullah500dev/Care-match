import {
  joiCreateFacilitySchema,
  joiUpdateFacilitySchema,
} from "../../utils/joiSchema/facilitySchema.js";
import validationResponse from "../../utils/validationResponse.js";

const createFacilityValidation = (req, _, next) => {
  const { error, value } = joiCreateFacilitySchema.validate(req.body);
  if (error) return validationResponse(error, next);
  Object.assign(req.body, value);
  next();
};

const updateFacilityValidation = (req, _, next) => {
  const { error, value } = joiUpdateFacilitySchema.validate(req.body);
  if (error) return validationResponse(error, next);
  Object.assign(req.body, value);
  next();
};

export { createFacilityValidation, updateFacilityValidation };
