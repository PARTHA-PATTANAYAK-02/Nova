import jwt from "jsonwebtoken";
import { environment } from "../config/environment.js";
import { accessTokenCookieOptions, refreshTokenCookieOptions } from "../utils/authCookie.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { User } from "../models/user.model.js";

const isAuthenticated = async (req, res, next) => {
  const token = req.cookies?.token;
  const refreshToken = req.cookies?.refreshToken;

  if (token) {
    try {
      const decode = jwt.verify(token, environment.authentication.jwtSecret);
      if (decode?.userId) {
        req.id = decode.userId;
        return next();
      }
    } catch (tokenError) {
      // Access token expired or invalid; fall through to refresh token verification
    }
  }

  // Attempt silent refresh using the 30-day refreshToken cookie
  if (refreshToken) {
    try {
      const decodeRefresh = jwt.verify(
        refreshToken,
        environment.authentication.jwtSecret,
      );
      if (decodeRefresh?.userId) {
        const userExists = await User.exists({ _id: decodeRefresh.userId });
        if (userExists) {
          const newAccessToken = generateAccessToken(decodeRefresh.userId);
          const newRefreshToken = generateRefreshToken(decodeRefresh.userId);
          // Sliding session: keep active users logged in smoothly
          res.cookie("token", newAccessToken, accessTokenCookieOptions);
          res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);
          req.id = decodeRefresh.userId;
          return next();
        }
      }
    } catch (refreshError) {
      // Refresh token is expired or invalid
    }
  }

  // Neither token is valid. Return 401 without prematurely wiping cookies here
  return res.status(401).json({
    message: "Session expired. Please log in again.",
    success: false,
  });
};

export default isAuthenticated;
