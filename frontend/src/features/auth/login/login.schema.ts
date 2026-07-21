import { z } from "zod";
import { authRoles } from "../types";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid business email"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(authRoles, {
    message: "Choose a role",
  }),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
