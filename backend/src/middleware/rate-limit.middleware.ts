import type { Request } from "express";
import { createHash } from "node:crypto";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

function normalizeKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" && forwarded.length ? forwarded.split(",")[0]?.trim() : req.ip;
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : undefined;
  const authorization = req.headers.authorization;

  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return `auth:${createHash("sha256").update(authorization.slice(7)).digest("hex")}`;
  }

  return `${email ?? ""}:${ip ?? req.ip ?? "unknown"}`;
}

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: normalizeKey,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  handler(req, _res, next) {
    next(new AppError("Too many requests. Please try again later.", 429));
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: normalizeKey,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
  handler(req, _res, next) {
    next(new AppError("Too many authentication attempts. Please try again later.", 429));
  },
});

export const securityDashboardRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator(req) {
    return typeof req.user?.id === "string" ? req.user.id : (req.ip ?? "unknown");
  },
  message: {
    success: false,
    message: "Too many security dashboard requests.",
  },
  handler(req, _res, next) {
    next(new AppError("Too many security dashboard requests.", 429));
  },
});
