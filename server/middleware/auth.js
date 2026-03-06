import catchAsyncError from "./catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import jwt from "jsonwebtoken";
import { updateAccessToken } from "../controllers/authController.js";

// authenticated user – accept token from header or cookie (e.g. after login in Swagger)
export const isAutheticated = catchAsyncError(async (req, res, next) => {
  const access_token =
    req.headers["access-token"] || req.cookies?.access_token;

  if (!access_token) {
    return next(new ErrorHandler("Please login to access this resource", 400));
  }
  const decoded = jwt.decode(access_token);
  if (!decoded) {
    return next(new ErrorHandler("access token is not valid", 400));
  }

  // check if the access token is expired
  if (decoded.exp && decoded.exp <= Date.now() / 1000) {
    try {
      updateAccessToken(req, res, next);
    } catch (error) {
      return next(error);
    }
  } else {
    req.user = decoded;
    next();
  }
});
