import { environment } from "../config/environment.js";

export const authCookieOptions = {
  httpOnly: true,
  secure: environment.runtime.isProduction,
  sameSite: environment.runtime.isProduction ? "none" : "lax",
  path: "/",
};

export const accessTokenCookieOptions = {
  ...authCookieOptions,
  maxAge: 60 * 60 * 1000, // 1 hour access token
};

export const refreshTokenCookieOptions = {
  ...authCookieOptions,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days persistent refresh session
};

export const clearAuthCookie = (res) => {
  res.clearCookie("token", authCookieOptions);
  res.clearCookie("refreshToken", authCookieOptions);
};

