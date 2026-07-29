import { z } from "zod";
import { passwordPolicySchema } from "../utils/password.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordPolicySchema,
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const setPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordPolicySchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordRequestSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

