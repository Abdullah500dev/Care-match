import Joi from "joi";
import validate from "../validation.js";

const password = Joi.string()
  .min(8)
  .regex(/[A-Z]/, "uppercase letter")
  .regex(/[a-z]/, "lowercase letter")
  .regex(/[0-9]/, "number")
  .required();

const validateUpdatePassword = validate(
  Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: password,
    confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
  })
);

const validateUpdateProfile = validate(
  Joi.object({
    firstName: Joi.string().trim(),
    lastName: Joi.string().trim(),
  })
);

export default { validateUpdatePassword, validateUpdateProfile };
