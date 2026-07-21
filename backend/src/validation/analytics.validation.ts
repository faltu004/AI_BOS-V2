import { z } from "zod";

export const analyticsQuerySchema = z.object({
  section: z.enum(["health-score", "revenue", "expenses", "sales", "productivity", "risks", "customers", "financial"]).optional(),
  dateRange: z.enum(["3m", "6m", "12m", "all"]).default("12m"),
  department: z.string().max(64).optional(),
  metric: z.string().max(64).optional(),
});

export const analyticsExportSchema = z.object({
  sections: z.array(z.enum(["health-score", "revenue", "expenses", "sales", "productivity", "risks", "customers", "financial"])).min(1),
  format: z.enum(["pdf", "csv"]),
  dateRange: z.string().max(32).optional(),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type AnalyticsExportInput = z.infer<typeof analyticsExportSchema>;