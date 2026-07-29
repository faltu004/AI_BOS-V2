import { z } from "zod";
import { userRoles } from "../constants/roles.js";
import { passwordPolicySchema } from "../utils/password.js";

const employeeDocumentSchema = z.object({
  name: z.string().min(1).max(160),
  type: z.string().min(1).max(40),
  size: z.string().min(1).max(20),
});

export const employeeProfileSchema = z
  .object({
    phone: z.string().max(32).optional(),
    location: z.string().max(160).optional(),
    designation: z.string().max(120).optional(),
    employmentType: z.string().max(40).optional(),
    joiningDate: z.coerce.date().optional(),
    employmentStatus: z.enum(["Active", "On Leave", "Inactive"]).optional(),
    personalInformation: z
      .object({
        dateOfBirth: z.string().max(32).optional(),
        gender: z.string().max(32).optional(),
        nationality: z.string().max(64).optional(),
        maritalStatus: z.string().max(32).optional(),
      })
      .optional(),
    contact: z
      .object({
        address: z.string().max(240).optional(),
        emergencyContact: z.string().max(64).optional(),
      })
      .optional(),
    skills: z.array(z.string().max(60)).optional(),
    experience: z.array(z.string().max(200)).optional(),
    education: z.array(z.string().max(200)).optional(),
    documents: z.array(employeeDocumentSchema).optional(),
    salaryDetails: z
      .object({
        annualCtc: z.number().min(0).optional(),
        monthlySalary: z.number().min(0).optional(),
        bank: z.string().max(120).optional(),
        taxId: z.string().max(40).optional(),
      })
      .optional(),
    performanceScore: z.number().min(0).max(100).optional(),
    employeeCode: z.string().max(40).optional(),
  })
  .strict();

export const createUserSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordPolicySchema,
  role: z.enum(userRoles),
  departmentId: z.string().length(24).optional(),
  employeeProfile: employeeProfileSchema.optional(),
});

export const updateEmployeeProfileSchema = z.object({
  departmentId: z.string().length(24).optional(),
  employeeProfile: employeeProfileSchema.optional(),
});

export type CreateUserProfileInput = z.infer<typeof createUserSchema>;
export type EmployeeProfileInput = z.infer<typeof employeeProfileSchema>;
export type UpdateEmployeeProfileInput = z.infer<typeof updateEmployeeProfileSchema>;
