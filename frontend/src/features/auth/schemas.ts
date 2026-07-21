import { z } from "zod";
import { authRoles } from "./types";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password needs one uppercase letter")
  .regex(/[0-9]/, "Password needs one number");

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    companyName: z.string().min(2, "Enter your company name"),
    email: z.string().email("Enter a valid business email"),
    role: z.enum(authRoles, {
      message: "Choose a role",
    }),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    acceptTerms: z.boolean().refine((value) => value, {
      message: "You must accept the terms",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter the email linked to your account"),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const emailVerificationSchema = z.object({
  code: z
    .string()
    .min(6, "Enter the 6-digit verification code")
    .max(6, "Enter the 6-digit verification code")
    .regex(/^[0-9]+$/, "Code must contain only numbers"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type EmailVerificationFormValues = z.infer<typeof emailVerificationSchema>;
