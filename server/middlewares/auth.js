import jwt from "jsonwebtoken";
import catchAsyncError from "./catchAsyncErrors.js";
import User from "../models/userModel.js";
import config from "../config/env.js";

const isAuthenticated = catchAsyncError(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(400).send({ error: "You are not authenticated!" });
  }
  const decoded = jwt.verify(token, config.JWT_SECRET);

  req.user = await User.findById(decoded.id);

  next();
});

const isVerified = catchAsyncError(async (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(400).send({ error: "User is not verified!" });
  }
  next();
});

const isAccessible = catchAsyncError(async (req, res, next) => {
  if (req.user.isBlocked) {
    return res.status(400).send({ error: "User access is restricted!" });
  }
  next();
});

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(400).send({
        error: `Role ${req.user.role} is not allowed to access this route`,
      });
    }
    next();
  };
};

export default { isAuthenticated, isVerified, isAccessible, authorizeRoles };
