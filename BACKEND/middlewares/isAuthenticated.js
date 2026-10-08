import jwt from "jsonwebtoken";
import { environment } from "../config/environment.js";
import { clearAuthCookie } from "../utils/authCookie.js";

const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }
    const decode = await jwt.verify(token, environment.authentication.jwtSecret);
    if (!decode) {
      return res.status(401).json({
        message: "Invalid",
        success: false,
      });
    }
    req.id = decode.userId;
    next();
  } catch (error) {
    clearAuthCookie(res);
    return res.status(401).json({
      message: "Invalid or expired authentication token",
      success: false,
    });
  }
};
export default isAuthenticated;
