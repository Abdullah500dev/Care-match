import ErrorHandler from "./errorHandler.js";

const validationResponse = (error, next) => {
  if (error) {
    return next(new ErrorHandler(error.details[0].message, 400));
  }
  next();
};

export default validationResponse;
