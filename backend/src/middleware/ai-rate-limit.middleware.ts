import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator(req) {
    return req.user?.id ?? req.ip ?? "unknown";
  },
  handler(_req, _res, next) {
    next(new AppError("Too many AI requests. Please try again shortly.", 429));
  },
});
