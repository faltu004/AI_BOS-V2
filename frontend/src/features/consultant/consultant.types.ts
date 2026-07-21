export type ConsultantAnalysisType = "business_health" | "swot" | "revenue" | "expense" | "sales" | "project" | "employee" | "risk" | "suggestion" | "summary";
export type ConsultantSummaryPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "annual";
export type ConsultantReportStatus = "draft" | "final" | "archived";
export type ConsultantPriority = "high" | "medium" | "low";

export type ConsultantMetric = {
  label: string;
  value: string | number;
  change?: string;
  source: string;
  confidence: number;
};

export type ConsultantSection = {
  title: string;
  content: string;
  data?: Record<string, unknown>;
  sourceModules: string[];
  confidence: number;
};

export type ConsultantRecommendation = {
  priority: ConsultantPriority;
  category: string;
  action: string;
  impact: string;
  effort: string;
};

export type ConsultantDataSource = {
  module: string;
  recordCount: number;
  available: boolean;
};

export type ConsultantReport = {
  id: string;
  title: string;
  type: ConsultantAnalysisType;
  period?: ConsultantSummaryPeriod;
  status: ConsultantReportStatus;
  summary: string;
  metrics: ConsultantMetric[];
  sections: ConsultantSection[];
  recommendations: ConsultantRecommendation[];
  dataSources: ConsultantDataSource[];
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ConsultantFormInput = {
  type: ConsultantAnalysisType;
  period?: ConsultantSummaryPeriod;
  dateRange?: { start?: string; end?: string };
  departments?: string[];
  includeModules?: string[];
};

export type ConsultantView = "dashboard" | "reports" | "generate";
