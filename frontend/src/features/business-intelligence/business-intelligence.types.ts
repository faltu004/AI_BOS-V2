export type BIChartType = "line" | "bar" | "area" | "pie";
export type BIInsightSeverity = "success" | "warning" | "danger" | "info";

export type BIChartSeries = {
  name: string;
  data_key: string;
  color: string;
};

export type BIChart = {
  id: string;
  title: string;
  type: BIChartType;
  x_key: string;
  data: Record<string, string | number | boolean | null>[];
  series: BIChartSeries[];
};

export type BIMetric = {
  label: string;
  value: string;
  change?: string | null;
  tone: BIInsightSeverity;
  source?: string | null;
};

export type BIInsight = {
  title: string;
  detail: string;
  severity: BIInsightSeverity;
};

export type BISource = {
  module: string;
  label: string;
  record_count: number;
};

export type BIQueryResponse = {
  answer: string;
  intent: string;
  metrics: BIMetric[];
  insights: BIInsight[];
  charts: BIChart[];
  actions: string[];
  sources: BISource[];
  generated_at: string;
};

export type BusinessSnapshot = Record<string, unknown>;
