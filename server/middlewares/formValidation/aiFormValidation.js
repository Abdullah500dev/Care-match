import Joi from "joi";
import validate from "../validation.js";

const validateAIContent = validate(
  Joi.object({
    title: Joi.string().trim().optional(),
    description: Joi.string().trim().optional(),
  })
);

export default { validateAIContent };
