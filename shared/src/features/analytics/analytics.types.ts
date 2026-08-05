export type AnalyticsPoint = {
 month: string;
 revenue: number;
 sales: number;
 customers: number;
 projects: number;
 employees: number;
 tasks: number;
 satisfaction: number;
 completionRate: number;
};

export type AnalyticsKpi = {
 label: string;
 value: string;
 change: string;
 tone: "primary" | "success" | "warning";
};
