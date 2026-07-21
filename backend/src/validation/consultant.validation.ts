import { z } from "zod";

export const consultantAnalysisTypes = ["business_health", "swot", "revenue", "expense", "sales", "project", "employee", "risk", "suggestion", "summary"] as const;

export const consultantSummaryPeriods = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;

export const consultantReportStatuses = ["draft", "final", "archived"] as const;

export const consultantAnalysisSchema = z.object({
  type: z.enum(consultantAnalysisTypes),
  period: z.enum(consultantSummaryPeriods).optional(),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  departments: z.array(z.string().max(60)).default([]),
  includeModules: z.array(z.string().max(60)).default(["projects", "users", "workflows"]),
});

export const consultantReportIdSchema = z.object({
  id: z.string().min(1),
});

export const consultantListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  type: z.enum(consultantAnalysisTypes).optional(),
  status: z.enum(consultantReportStatuses).optional(),
  period: z.enum(consultantSummaryPeriods).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title", "type"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const consultantExportSchema = z.object({
  reportId: z.string().min(1),
  format: z.enum(["pdf", "excel", "word"]),
});

export type ConsultantAnalysisInput = z.infer<typeof consultantAnalysisSchema>;
export type ConsultantListQuery = z.infer<typeof consultantListQuerySchema>;
export type ConsultantExportInput = z.infer<typeof consultantExportSchema>;
