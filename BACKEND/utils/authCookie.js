import { environment } from "../config/environment.js";

export const authCookieOptions = {
  httpOnly: true,
  secure: environment.runtime.isProduction,
  sameSite: environment.runtime.isProduction ? "none" : "lax",
  path: "/",
};

export const clearAuthCookie = (res) =>
  res.clearCookie("token", authCookieOptions);
