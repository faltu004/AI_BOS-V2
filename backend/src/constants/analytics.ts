export const ANALYTICS_SECTIONS = {
  overview: "overview",
  sales: "sales",
} as const;

export type AnalyticsSection = (typeof ANALYTICS_SECTIONS)[keyof typeof ANALYTICS_SECTIONS];

export const ANALYTICS_DATE_RANGES = ["3m", "6m", "12m", "all"] as const;
export type AnalyticsDateRange = (typeof ANALYTICS_DATE_RANGES)[number];
