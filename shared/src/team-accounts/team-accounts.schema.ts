import { z } from "zod";
import { authRoles, type AuthRole } from "@shared/auth/types";

export const createProfileSchema = z.object({
 fullName: z.string().min(2, "Enter a full name"),
 email: z.string().email("Enter a valid email"),
 password: z
 .string()
 .min(12, "Password must be at least 12 characters")
 .regex(/[A-Z]/, "Password needs one uppercase letter")
 .regex(/[a-z]/, "Password needs one lowercase letter")
 .regex(/[0-9]/, "Password needs one number")
 .regex(/[^A-Za-z0-9]/, "Password needs one special character"),
 role: z.enum(authRoles, { message: "Choose a role" }),
 managerId: z.string().optional(),
 phone: z.string().min(1, "Enter a phone number").max(32),
});

export type CreateProfileFormValues = z.infer<typeof createProfileSchema>;

export type TeamAccount = {
 id: string;
 fullName: string;
 companyName: string;
 email: string;
 role: AuthRole;
 isActive: boolean;
 managerId?: string;
 manager?: { id: string; fullName: string; email: string; role: AuthRole };
 phone?: string;
 createdAt: string;
};
