import type { Response } from "express";
import { refreshTokenCookieName } from "../constants/auth.js";
import { appConfig } from "../config/app.js";

const refreshCookieMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie(refreshTokenCookieName, refreshToken, {
    httpOnly: true,
    secure: appConfig.isProduction,
    sameSite: appConfig.isProduction ? "none" : "lax",
    domain: appConfig.cookieDomain || undefined,
    maxAge: refreshCookieMaxAgeMs,
    path: "/",
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(refreshTokenCookieName, {
    httpOnly: true,
    secure: appConfig.isProduction,
    sameSite: appConfig.isProduction ? "none" : "lax",
    domain: appConfig.cookieDomain || undefined,
    path: "/",
  });
}
