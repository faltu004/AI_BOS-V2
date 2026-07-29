import { z } from "zod";
import { policyCategories, policyStatuses } from "../constants/policy.js";

export const createCompanyPolicySchema = z.object({
  title: z.string().min(2).max(200),
  category: z.enum(policyCategories).default("General"),
  content: z.string().min(1).max(20000),
  status: z.enum(policyStatuses).default("Draft"),
  effectiveDate: z.coerce.date().optional(),
  acknowledgementRequired: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(40)).default([]),
});

export const updateCompanyPolicySchema = z.object({
  title: z.string().min(2).max(200).optional(),
  category: z.enum(policyCategories).optional(),
  content: z.string().min(1).max(20000).optional(),
  status: z.enum(policyStatuses).optional(),
  effectiveDate: z.coerce.date().optional(),
  acknowledgementRequired: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
});

export const companyPolicyIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listCompanyPoliciesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  category: z.enum(policyCategories).optional(),
  status: z.enum(policyStatuses).optional(),
  sortBy: z.enum(["title", "category", "status", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateCompanyPolicyInput = z.infer<typeof createCompanyPolicySchema>;
export type UpdateCompanyPolicyInput = z.infer<typeof updateCompanyPolicySchema>;
export type ListCompanyPoliciesQuery = z.infer<typeof listCompanyPoliciesQuerySchema>;
