import {
  joiRegisterSchema,
  joiLoginSchema,
  joiForgetPasswordSchema,
  joiResetPasswordSchema,
  joiVerifyActivationSchema,
} from "../../utils/joiSchema/authSchema.js";

import validationResponse from "../../utils/validationResponse.js";

// Register form validation
const registerValidation = (req, _, next) => {
  const { error } = joiRegisterSchema.validate(req.body);
  validationResponse(error, next);
};

// Login form validation
const loginValidation = (req, _, next) => {
  const { error } = joiLoginSchema.validate(req.body);
  validationResponse(error, next);
};

// Forget password form validation
const forgetPasswordEmailValidation = (req, _, next) => {
  const { error } = joiForgetPasswordSchema.validate(req.body);
  validationResponse(error, next);
};

// Reset password form validation
const resetPasswordValidation = (req, res, next) => {
  const { error } = joiResetPasswordSchema.validate(req.body);
  validationResponse(error, next);
};

// Verify activation (6-digit code) form validation
const verifyActivationValidation = (req, _, next) => {
  const { error } = joiVerifyActivationSchema.validate(req.body);
  validationResponse(error, next);
};

export {
  registerValidation,
  loginValidation,
  forgetPasswordEmailValidation,
  resetPasswordValidation,
  verifyActivationValidation,
};
