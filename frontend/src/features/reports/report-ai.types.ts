export type ReportType = "finance" | "projects" | "crm" | "employees" | "meetings" | "customers" | "business_performance";

export type ReportFormat = "pdf" | "excel" | "word" | "email";

export type ReportSectionType = "chart" | "table" | "summary" | "insights";

export type ReportSection = {
  type: ReportSectionType;
  title: string;
  data: Record<string, unknown>;
  aiInsights?: string;
};

export type ReportRequest = {
  reportType: ReportType;
  format: ReportFormat;
  dateRange: string;
  sections: string[];
  recipients?: string[];
  schedule?: string;
};

export type ReportResponse = {
  id: string;
  reportType: string;
  format: string;
  sections: ReportSection[];
  aiSummary: string;
  recommendations: string[];
  insights: string[];
  downloadUrl?: string;
  generatedAt: string;
};

export type ScheduledReport = {
  id: string;
  reportType: string;
  format: string;
  frequency: string;
  recipients: string[];
  lastRun?: string;
  nextRun?: string;
  isActive: boolean;
  createdAt: string;
};

export type ReportFrequency = "daily" | "weekly" | "monthly" | "quarterly";