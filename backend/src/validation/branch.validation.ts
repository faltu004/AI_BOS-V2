import { z } from "zod";
import { branchTypes } from "../constants/branch.js";
import { departmentStatuses } from "../constants/department.js";

const pincodeRegex = /^\d{6}$/;

export const createBranchSchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(branchTypes).default("Branch"),
  isHeadOffice: z.boolean().default(false),
  addressLine1: z.string().min(2).max(160),
  addressLine2: z.string().max(160).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  country: z.string().max(100).default("India"),
  pincode: z.string().regex(pincodeRegex, "Pincode must be 6 digits"),
  timezone: z.string().max(60).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.enum(departmentStatuses).default("Active"),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  type: z.enum(branchTypes).optional(),
  isHeadOffice: z.boolean().optional(),
  addressLine1: z.string().min(2).max(160).optional(),
  addressLine2: z.string().max(160).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  country: z.string().max(100).optional(),
  pincode: z.string().regex(pincodeRegex, "Pincode must be 6 digits").optional(),
  timezone: z.string().max(60).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.enum(departmentStatuses).optional(),
});

export const branchIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listBranchesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(departmentStatuses).optional(),
  sortBy: z.enum(["name", "city", "status", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type ListBranchesQuery = z.infer<typeof listBranchesQuerySchema>;
