import Joi from "joi";

const joiRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .regex(/[A-Z]/, "uppercase letter")
    .regex(/[a-z]/, "lowercase letter")
    .regex(/[0-9]/, "number")
    .required()
    .messages({
      "string.min":
        "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      "string.pattern.name":
        "Password must include at least one {#name}",
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Confirm password must match password",
      "string.empty": "Confirm password is required",
      "any.required": "Confirm password is required",
    }),
  role: Joi.string().valid("user", "facility").default("user"),
});

const joiLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const joiForgetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const joiVerifyActivationSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.pattern.base": "Verification code must be 6 digits",
    }),
});

const joiResetPasswordSchema = Joi.object({
  token: Joi.string().optional(),
  newPassword: Joi.string()
    .min(8)
    .regex(/[A-Z]/, "uppercase letter")
    .regex(/[a-z]/, "lowercase letter")
    .regex(/[0-9]/, "number")
    .required()
    .messages({
      "string.min":
        "New password must be at least 8 characters and include uppercase, lowercase, and a number",
      "string.pattern.name":
        "New password must include at least one {#name}",
      "string.empty": "New password is required",
      "any.required": "New password is required",
    }),
  confirmPassword: Joi.any()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Confirm password must match new password",
      "any.required": "Confirm password is required",
    }),
});

export {
  joiRegisterSchema,
  joiLoginSchema,
  joiForgetPasswordSchema,
  joiResetPasswordSchema,
  joiVerifyActivationSchema,
};
