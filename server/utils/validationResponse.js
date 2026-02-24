import ErrorHandler from "./errorHandler.js";

const validationResponse = (error, next) => {
  if (error) {
    next(new ErrorHandler(400, error.details[0].message));
  }
  next();
};

export default validationResponse;
