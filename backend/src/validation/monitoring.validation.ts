import { z } from "zod";

export const monitoringOverviewQuerySchema = z.object({
  category: z.enum(["application", "server", "database", "api", "ai", "business"]).optional(),
});

export const monitoringReportExportSchema = z.object({
  type: z.enum(["health", "performance", "incident", "ai"]).default("health"),
  format: z.enum(["csv", "pdf"]).default("csv"),
});

export type MonitoringOverviewQueryInput = z.infer<typeof monitoringOverviewQuerySchema>;
export type MonitoringReportExportInput = z.infer<typeof monitoringReportExportSchema>;
