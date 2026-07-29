import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "./app-error.js";

export type PasswordPolicy = {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  maxAgeDays: number;
  historyLimit: number;
};

export function getPasswordPolicy(): PasswordPolicy {
  return {
    minLength: env.PASSWORD_MIN_LENGTH,
    requireUppercase: env.PASSWORD_REQUIRE_UPPERCASE,
    requireLowercase: env.PASSWORD_REQUIRE_LOWERCASE,
    requireNumber: env.PASSWORD_REQUIRE_NUMBER,
    requireSpecial: env.PASSWORD_REQUIRE_SPECIAL,
    maxAgeDays: env.PASSWORD_MAX_AGE_DAYS,
    historyLimit: env.PASSWORD_HISTORY_LIMIT,
  };
}

export function validatePasswordPolicy(password: string): void {
  const policy = getPasswordPolicy();

  if (password.length < policy.minLength) {
    throw new AppError(`Password must be at least ${policy.minLength} characters`, 400);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    throw new AppError("Password needs one uppercase letter", 400);
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    throw new AppError("Password needs one lowercase letter", 400);
  }

  if (policy.requireNumber && !/[0-9]/.test(password)) {
    throw new AppError("Password needs one number", 400);
  }

  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    throw new AppError("Password needs one special character", 400);
  }
}

/** Reused by every schema that accepts a new password — surfaces the specific policy failure, not a generic message. */
export const passwordPolicySchema = z
  .string()
  .min(1, "Password is required")
  .superRefine((password, ctx) => {
    try {
      validatePasswordPolicy(password);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof AppError ? error.message : "Password does not meet security policy",
      });
    }
  });

export function hashPassword(password: string) {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function isPasswordBreached(password: string): Promise<boolean> {
  const sha1 = crypto.createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "User-Agent": "ai-bos-security" },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) return false;
    const text = await response.text();
    return text.split("\n").some((line) => line.startsWith(suffix));
  } catch {
    return false;
  }
}
