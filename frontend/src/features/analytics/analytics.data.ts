import type { AnalyticsKpi, AnalyticsPoint } from "./analytics.types";

export const analyticsData: AnalyticsPoint[] = [
  { month: "Jan", revenue: 124000, sales: 46, customers: 820, projects: 62, employees: 218, tasks: 390, satisfaction: 88, completionRate: 71 },
  { month: "Feb", revenue: 138000, sales: 52, customers: 870, projects: 68, employees: 224, tasks: 418, satisfaction: 89, completionRate: 74 },
  { month: "Mar", revenue: 152000, sales: 59, customers: 936, projects: 74, employees: 229, tasks: 430, satisfaction: 90, completionRate: 76 },
  { month: "Apr", revenue: 171000, sales: 66, customers: 1004, projects: 81, employees: 234, tasks: 452, satisfaction: 91, completionRate: 79 },
  { month: "May", revenue: 188000, sales: 73, customers: 1108, projects: 92, employees: 239, tasks: 468, satisfaction: 92, completionRate: 82 },
  { month: "Jun", revenue: 206000, sales: 79, customers: 1190, projects: 103, employees: 244, tasks: 476, satisfaction: 94, completionRate: 85 },
  { month: "Jul", revenue: 267000, sales: 91, customers: 1284, projects: 128, employees: 248, tasks: 482, satisfaction: 95, completionRate: 88 },
];

export const analyticsKpis: AnalyticsKpi[] = [
  { label: "Growth %", value: "29.6%", change: "+7.4% vs last month", tone: "success" },
  { label: "Monthly Revenue", value: "$267K", change: "+$61K this month", tone: "primary" },
  { label: "Customer Satisfaction", value: "95%", change: "+3 pts quarter over quarter", tone: "success" },
  { label: "Project Completion Rate", value: "88%", change: "+6% delivery velocity", tone: "warning" },
];
