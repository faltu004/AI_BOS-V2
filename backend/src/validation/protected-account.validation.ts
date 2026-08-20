import { z } from "zod";
import { passwordPolicySchema } from "../utils/password.js";

export const firstOwnerBootstrapSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const administratorCredentialsSchema = z
  .object({
    email: z.string().email().optional(),
    password: passwordPolicySchema.optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type FirstOwnerBootstrapInput = z.infer<typeof firstOwnerBootstrapSchema>;
export type AdministratorCredentialsInput = z.infer<typeof administratorCredentialsSchema>;
