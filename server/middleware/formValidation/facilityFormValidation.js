import {
  joiCreateFacilitySchema,
  joiUpdateFacilitySchema,
} from "../../utils/joiSchema/facilitySchema.js";
import validationResponse from "../../utils/validationResponse.js";

const createFacilityValidation = (req, _, next) => {
  const { error } = joiCreateFacilitySchema.validate(req.body);
  validationResponse(error, next);
};

const updateFacilityValidation = (req, _, next) => {
  const { error } = joiUpdateFacilitySchema.validate(req.body);
  validationResponse(error, next);
};

export { createFacilityValidation, updateFacilityValidation };
