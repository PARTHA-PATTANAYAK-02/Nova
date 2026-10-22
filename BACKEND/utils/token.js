import jwt from "jsonwebtoken";
import { environment } from "../config/environment.js";

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId: userId.toString(), type: "access" },
    environment.authentication.jwtSecret,
    { expiresIn: "1h" },
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId: userId.toString(), type: "refresh" },
    environment.authentication.jwtSecret,
    { expiresIn: "30d" },
  );
};
