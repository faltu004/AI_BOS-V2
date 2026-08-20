import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default("/api/v1"),
  CLIENT_ORIGIN: z
    .string()
    .default("http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  COOKIE_DOMAIN: z.string().optional(),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  JWT_ISSUER: z.string().default("ai-bos-api"),
  JWT_AUDIENCE: z.string().default("ai-bos-clients"),
  ENCRYPTION_SECRET: z.string().min(16).optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(14).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1200),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("llama3.2:3b"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default("AI BOS <notifications@aibos.company>"),
  INTEGRATION_OAUTH_REDIRECT_BASE_URL: z.string().optional(),
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).max(128).default(12),
  PASSWORD_REQUIRE_UPPERCASE: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_LOWERCASE: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_NUMBER: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_SPECIAL: z.coerce.boolean().default(true),
  PASSWORD_MAX_AGE_DAYS: z.coerce.number().int().positive().default(90),
  PASSWORD_HISTORY_LIMIT: z.coerce.number().int().min(0).max(24).default(5),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOCKOUT_DURATION_MINUTES: z.coerce.number().int().positive().default(15),
  SESSION_MAX_IDLE_MINUTES: z.coerce.number().int().positive().default(30),
  MAX_TRUSTED_DEVICES_PER_USER: z.coerce.number().int().positive().default(10),
  MAX_LOGIN_HISTORY_PER_USER: z.coerce.number().int().positive().default(50),
  ENABLE_LOGIN_HISTORY: z.coerce.boolean().default(true),
  ENABLE_TRUSTED_DEVICES: z.coerce.boolean().default(true),
  ENABLE_2FA: z.coerce.boolean().default(false),
  ENABLE_SECURITY_DASHBOARD: z.coerce.boolean().default(true),
  ATTENDANCE_OFFICE_LAT: z.coerce.number().min(-90).max(90).default(12.9716),
  ATTENDANCE_OFFICE_LNG: z.coerce.number().min(-180).max(180).default(77.5946),
  ATTENDANCE_RADIUS_METERS: z.coerce.number().int().positive().default(300),
  LOG_DIR: z.string().default("logs"),
  LOG_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(20),
  LOG_MAX_FILES: z.coerce.number().int().positive().default(10),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables", parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsedEnv.data.NODE_ENV === "production") {
  const weakSecrets = [
    ["JWT_ACCESS_SECRET", parsedEnv.data.JWT_ACCESS_SECRET],
    ["JWT_REFRESH_SECRET", parsedEnv.data.JWT_REFRESH_SECRET],
  ].filter(([, value]) => String(value).length < 32);

  if (weakSecrets.length > 0) {
    console.error("Production JWT secrets must be at least 32 characters", weakSecrets.map(([key]) => key));
    process.exit(1);
  }

  if (parsedEnv.data.CLIENT_ORIGIN.includes("*")) {
    console.error("Production CLIENT_ORIGIN must list explicit trusted origins");
    process.exit(1);
  }

  if (!parsedEnv.data.ENABLE_2FA && parsedEnv.data.NODE_ENV === "production") {
    console.warn("ENABLE_2FA is disabled in production; consider enabling it");
  }

  if (!parsedEnv.data.SMTP_HOST) {
    console.warn(
      "SMTP_HOST is not configured; password reset and other transactional emails will only be logged, not delivered. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD to enable real email delivery.",
    );
  }

  if (parsedEnv.data.JWT_ACCESS_EXPIRES_IN === parsedEnv.data.JWT_REFRESH_EXPIRES_IN) {
    console.error("Refuse to start with equal access and refresh token lifetimes");
    process.exit(1);
  }

  if (parsedEnv.data.BCRYPT_SALT_ROUNDS < 10 && parsedEnv.data.NODE_ENV === "production") {
    console.error("Increase BCRYPT_SALT_ROUNDS to at least 10 in production");
    process.exit(1);
  }
}

export const env = parsedEnv.data;
