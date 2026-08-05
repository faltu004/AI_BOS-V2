import { z } from "zod";

export const analyticsQuerySchema = z.object({
  section: z.enum(["overview", "sales"]).optional(),
  dateRange: z.enum(["3m", "6m", "12m", "all"]).default("12m"),
});

export const analyticsExportSchema = z.object({
  sections: z.array(z.enum(["overview", "sales"])).min(1),
  format: z.enum(["pdf", "csv"]),
  dateRange: z.string().max(32).optional(),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type AnalyticsExportInput = z.infer<typeof analyticsExportSchema>;
