import config from "../config/env.js";

const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();
  const tokenExpire = user.getTokenExpiry();

  const options = {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    expires: new Date(
      Date.now() + config.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
  };

  const filteredUser = {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    __v: user.__v,
    token: token,
    tokenExpire: tokenExpire,
  };

  res.status(statusCode).cookie("token", token, options).send({
    success: true,
    user: filteredUser,
  });
};

export default sendToken;
