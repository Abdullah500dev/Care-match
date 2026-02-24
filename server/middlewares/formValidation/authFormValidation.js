import Joi from "joi";
import validate from "../validation.js";

const email = Joi.string().email().trim().required();
const password = Joi.string()
  .min(8)
  .regex(/[A-Z]/, "uppercase letter")
  .regex(/[a-z]/, "lowercase letter")
  .regex(/[0-9]/, "number")
  .required();

const validateRegister = validate(
  Joi.object({
    email,
    firstName: Joi.string().trim().required(),
    lastName: Joi.string().trim().required(),
    password,
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  })
);

const validateLogin = validate(
  Joi.object({
    email,
    password: Joi.string().required(),
  })
);

const validateForgotPassword = validate(
  Joi.object({
    email,
  })
);

const validateResetPassword = validate(
  Joi.object({
    newPassword: password,
    confirmPassword: Joi.ref("newPassword"),
  })
);

export default {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
};
