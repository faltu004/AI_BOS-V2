import { env } from "./env.js";

export const appConfig = {
  name: "AI Business Operating System API",
  apiPrefix: env.API_PREFIX,
  isProduction: env.NODE_ENV === "production",
  clientOrigins: env.CLIENT_ORIGIN,
  cookieDomain: env.COOKIE_DOMAIN,
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  upload: {
    maxFileSizeMb: env.UPLOAD_MAX_FILE_SIZE_MB,
  },
};
