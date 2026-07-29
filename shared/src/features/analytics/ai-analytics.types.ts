export type PredictionPoint = {
  month: string;
  actual: number | null;
  predicted: number | null;
  upperBound?: number | null;
  lowerBound?: number | null;
};

export type BusinessHealthScore = {
  overall: number;
  category: "critical" | "warning" | "good" | "excellent";
  subScores: {
    label: string;
    score: number;
    maxScore: number;
    trend: "up" | "down" | "stable";
    severity: "danger" | "warning" | "success";
  }[];
  summary: string;
};

export type RevenuePrediction = {
  currentMonth: number;
  lastMonth: number;
  change: number;
  nextMonth: number;
  quarterlyForecast: number;
  predictions: PredictionPoint[];
};

export type ExpensePrediction = {
  currentMonth: number;
  lastMonth: number;
  change: number;
  projectedNextMonth: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  predictions: PredictionPoint[];
};

export type SalesForecast = {
  pipeline: number;
  won: number;
  expected: number;
  stages: { stage: string; value: number; count: number }[];
  monthlyForecast: { month: string; forecast: number; lower: number; upper: number }[];
};

export type DepartmentProductivity = {
  department: string;
  score: number;
  tasksCompleted: number;
  tasksAssigned: number;
  completionRate: number;
  trend: "up" | "down" | "stable";
};

export type EmployeeProductivity = {
  overall: number;
  departments: DepartmentProductivity[];
  monthlyData: { month: string; departments: Record<string, number> }[];
};

export type ProjectRisk = {
  projectId: string;
  projectName: string;
  riskScore: number;
  impact: number;
  likelihood: number;
  category: "schedule" | "budget" | "resource" | "technical" | "external";
  status: "low" | "medium" | "high" | "critical";
  description: string;
};

export type CustomerGrowth = {
  total: number;
  newThisMonth: number;
  churned: number;
  growthRate: number;
  predictedNextMonth: number;
  monthlyData: { month: string; total: number; new: number; churned: number }[];
  predictions: PredictionPoint[];
};

export type FinancialTrend = {
  grossMargin: number;
  netMargin: number;
  burnRate: number;
  runwayMonths: number;
  monthlyData: {
    month: string;
    revenue: number;
    expenses: number;
    grossMargin: number;
    operatingExpenses: number;
    netIncome: number;
  }[];
};

export type AnalyticsExportPayload = {
  sections: string[];
  format: "pdf" | "csv";
  dateRange: string;
};

export type AnalyticsFilterState = {
  dateRange: "3m" | "6m" | "12m" | "all";
  department: string | null;
  metric: string | null;
};