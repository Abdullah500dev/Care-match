import ErrorHandler from "../utils/errorHandler.js";

const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error } = schema.validate(req[source]);

    if (error) {
      next(new ErrorHandler(400, error.details[0].message));
      return;
    }

    next();
  };
};

export default validate;
