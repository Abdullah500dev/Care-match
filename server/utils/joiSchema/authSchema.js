import Joi from "joi";

const joiRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .regex(/[A-Z]/, "uppercase letter")
    .regex(/[a-z]/, "lowercase letter")
    .regex(/[0-9]/, "number")
    .required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
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
    .required(),
  confirmPassword: Joi.ref("newPassword"),
});

export {
  joiRegisterSchema,
  joiLoginSchema,
  joiForgetPasswordSchema,
  joiResetPasswordSchema,
  joiVerifyActivationSchema,
};
