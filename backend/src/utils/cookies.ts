import type { Response } from "express";
import { refreshTokenCookieName } from "../constants/auth.js";
import { appConfig } from "../config/app.js";
import { getTokenExpiry } from "./jwt.js";

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  const maxAge = Math.max(getTokenExpiry(refreshToken).getTime() - Date.now(), 0);

  res.cookie(refreshTokenCookieName, refreshToken, {
    httpOnly: true,
    secure: appConfig.isProduction,
    sameSite: "lax",
    domain: appConfig.cookieDomain || undefined,
    maxAge,
    path: "/",
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(refreshTokenCookieName, {
    httpOnly: true,
    secure: appConfig.isProduction,
    sameSite: "lax",
    domain: appConfig.cookieDomain || undefined,
    path: "/",
  });
}
