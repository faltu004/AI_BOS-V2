export const ANALYTICS_SECTIONS = {
  healthScore: "health-score",
  revenue: "revenue",
  expenses: "expenses",
  sales: "sales",
  productivity: "productivity",
  risks: "risks",
  customers: "customers",
  financial: "financial",
} as const;

export type AnalyticsSection = (typeof ANALYTICS_SECTIONS)[keyof typeof ANALYTICS_SECTIONS];

export const ANALYTICS_DATE_RANGES = ["3m", "6m", "12m", "all"] as const;
export type AnalyticsDateRange = (typeof ANALYTICS_DATE_RANGES)[number];

export const ANALYTICS_DEPARTMENTS = [
  "Engineering",
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "HR",
] as const;

export type AnalyticsDepartment = (typeof ANALYTICS_DEPARTMENTS)[number];