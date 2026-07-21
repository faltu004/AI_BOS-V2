import { z } from "zod";

export const reportTypeSchema = z.enum(["finance", "projects", "crm", "employees", "meetings", "customers", "business_performance"]);

export const reportFormatSchema = z.enum(["pdf", "excel", "word", "email"]);

export const reportGenerateSchema = z.object({
  report_type: reportTypeSchema,
  format: reportFormatSchema,
  date_range: z.string().default("30d"),
  sections: z.array(z.string()).default([]),
  recipients: z.array(z.string()).optional(),
  schedule: z.string().optional(),
});

export const reportExportSchema = z.object({
  report_id: z.string().min(1, "Report ID is required"),
  format: reportFormatSchema.default("pdf"),
});

export const reportScheduleSchema = z.object({
  report_type: reportTypeSchema,
  format: reportFormatSchema,
  frequency: z.string().min(1, "Frequency is required"),
  recipients: z.array(z.string()).min(1, "At least one recipient is required"),
  schedule: z.string().optional(),
});

export type ReportGenerateInput = z.infer<typeof reportGenerateSchema>;
export type ReportExportInput = z.infer<typeof reportExportSchema>;
export type ReportScheduleInput = z.infer<typeof reportScheduleSchema>;