import { z } from "zod";
import { authRoles } from "@shared/auth/types";

export const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password needs one uppercase letter")
    .regex(/[a-z]/, "Password needs one lowercase letter")
    .regex(/[0-9]/, "Password needs one number")
    .regex(/[^A-Za-z0-9]/, "Password needs one special character"),
  role: z.enum(authRoles, { message: "Choose a role" }),
  phone: z.string(),
  location: z.string(),
  department: z.string(),
  designation: z.string(),
  employmentType: z.string(),
  joiningDate: z.string(),
  status: z.enum(["Active", "On Leave", "Inactive"]),
  skills: z.array(z.string()),
  annualCtc: z.number({ message: "Enter a number" }).min(0, "Must be 0 or more"),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
