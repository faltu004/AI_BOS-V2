import { z } from "zod";
import { userRoles } from "../constants/roles.js";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password needs one uppercase letter")
  .regex(/[0-9]/, "Password needs one number");

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  companyName: z.string().min(2).max(160),
  email: z.string().email(),
  password: passwordSchema,
  role: z.enum(userRoles).default("Employee"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
