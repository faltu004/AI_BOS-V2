import type {
 BusinessHealthScore,
 CustomerGrowth,
 EmployeeProductivity,
 ExpensePrediction,
 FinancialTrend,
 ProjectRisk,
 RevenuePrediction,
 SalesForecast,
} from "./ai-analytics.types";

export const businessHealthScore: BusinessHealthScore = {
 overall: 74,
 category: "good",
 summary: "Business health is stable with strong revenue growth. Watch expenses and project delivery risks.",
 subScores: [
 { label: "Revenue Growth", score: 88, maxScore: 100, trend: "up", severity: "success" },
 { label: "Expense Control", score: 62, maxScore: 100, trend: "down", severity: "warning" },
 { label: "Customer Retention", score: 91, maxScore: 100, trend: "up", severity: "success" },
 { label: "Employee Productivity", score: 76, maxScore: 100, trend: "up", severity: "success" },
 { label: "Project Delivery", score: 68, maxScore: 100, trend: "down", severity: "warning" },
 { label: "Cash Flow", score: 72, maxScore: 100, trend: "stable", severity: "warning" },
 { label: "Sales Pipeline", score: 85, maxScore: 100, trend: "up", severity: "success" },
 { label: "Profit Margin", score: 70, maxScore: 100, trend: "stable", severity: "warning" },
 ],
};

export const revenuePrediction: RevenuePrediction = {
 currentMonth: 267000,
 lastMonth: 206000,
 change: 29.6,
 nextMonth: 289000,
 quarterlyForecast: 840000,
 predictions: [
 { month: "Jan", actual: 124000, predicted: null },
 { month: "Feb", actual: 138000, predicted: null },
 { month: "Mar", actual: 152000, predicted: null },
 { month: "Apr", actual: 171000, predicted: null },
 { month: "May", actual: 188000, predicted: null },
 { month: "Jun", actual: 206000, predicted: null },
 { month: "Jul", actual: 267000, predicted: null },
 { month: "Aug", actual: null, predicted: 289000, upperBound: 312000, lowerBound: 266000 },
 { month: "Sep", actual: null, predicted: 312000, upperBound: 341000, lowerBound: 283000 },
 { month: "Oct", actual: null, predicted: 335000, upperBound: 368000, lowerBound: 302000 },
 { month: "Nov", actual: null, predicted: 356000, upperBound: 392000, lowerBound: 320000 },
 { month: "Dec", actual: null, predicted: 384000, upperBound: 425000, lowerBound: 343000 },
 ],
};

export const expensePrediction: ExpensePrediction = {
 currentMonth: 194000,
 lastMonth: 176000,
 change: 10.2,
 projectedNextMonth: 208000,
 topCategories: [
 { category: "Payroll", amount: 98000, percentage: 50.5 },
 { category: "Infrastructure", amount: 32000, percentage: 16.5 },
 { category: "Marketing", amount: 28000, percentage: 14.4 },
 { category: "Operations", amount: 22000, percentage: 11.3 },
 { category: "R&D", amount: 14000, percentage: 7.2 },
 ],
 predictions: [
 { month: "Jan", actual: 112000, predicted: null },
 { month: "Feb", actual: 121000, predicted: null },
 { month: "Mar", actual: 129000, predicted: null },
 { month: "Apr", actual: 138000, predicted: null },
 { month: "May", actual: 152000, predicted: null },
 { month: "Jun", actual: 176000, predicted: null },
 { month: "Jul", actual: 194000, predicted: null },
 { month: "Aug", actual: null, predicted: 208000, upperBound: 218000, lowerBound: 198000 },
 { month: "Sep", actual: null, predicted: 221000, upperBound: 233000, lowerBound: 209000 },
 { month: "Oct", actual: null, predicted: 235000, upperBound: 249000, lowerBound: 221000 },
 { month: "Nov", actual: null, predicted: 248000, upperBound: 264000, lowerBound: 232000 },
 { month: "Dec", actual: null, predicted: 262000, upperBound: 280000, lowerBound: 244000 },
 ],
};

export const salesForecast: SalesForecast = {
 pipeline: 1240000,
 won: 520000,
 expected: 890000,
 stages: [
 { stage: "Discovery", value: 340000, count: 18 },
 { stage: "Qualified", value: 480000, count: 12 },
 { stage: "Proposal", value: 260000, count: 8 },
 { stage: "Negotiation", value: 160000, count: 5 },
 ],
 monthlyForecast: [
 { month: "Aug", forecast: 267000, lower: 210000, upper: 320000 },
 { month: "Sep", forecast: 295000, lower: 235000, upper: 355000 },
 { month: "Oct", forecast: 320000, lower: 255000, upper: 385000 },
 { month: "Nov", forecast: 348000, lower: 278000, upper: 418000 },
 { month: "Dec", forecast: 380000, lower: 305000, upper: 455000 },
 ],
};

export const employeeProductivity: EmployeeProductivity = {
 overall: 76,
 departments: [
 { department: "Engineering", score: 82, tasksCompleted: 142, tasksAssigned: 168, completionRate: 84.5, trend: "up" },
 { department: "Sales", score: 79, tasksCompleted: 98, tasksAssigned: 124, completionRate: 79.0, trend: "up" },
 { department: "Marketing", score: 71, tasksCompleted: 76, tasksAssigned: 108, completionRate: 70.4, trend: "stable" },
 { department: "Operations", score: 74, tasksCompleted: 64, tasksAssigned: 86, completionRate: 74.4, trend: "up" },
 { department: "Finance", score: 68, tasksCompleted: 48, tasksAssigned: 70, completionRate: 68.6, trend: "down" },
 { department: "HR", score: 77, tasksCompleted: 52, tasksAssigned: 66, completionRate: 78.8, trend: "stable" },
 ],
 monthlyData: [
 { month: "Jan", departments: { Engineering: 72, Sales: 68, Marketing: 65, Operations: 70, Finance: 64, HR: 71 } },
 { month: "Feb", departments: { Engineering: 74, Sales: 70, Marketing: 66, Operations: 71, Finance: 65, HR: 72 } },
 { month: "Mar", departments: { Engineering: 76, Sales: 72, Marketing: 68, Operations: 72, Finance: 66, HR: 73 } },
 { month: "Apr", departments: { Engineering: 78, Sales: 74, Marketing: 69, Operations: 72, Finance: 67, HR: 74 } },
 { month: "May", departments: { Engineering: 80, Sales: 76, Marketing: 70, Operations: 73, Finance: 68, HR: 75 } },
 { month: "Jun", departments: { Engineering: 81, Sales: 78, Marketing: 71, Operations: 74, Finance: 68, HR: 76 } },
 { month: "Jul", departments: { Engineering: 82, Sales: 79, Marketing: 71, Operations: 74, Finance: 68, HR: 77 } },
 ],
};

export const projectRisks: ProjectRisk[] = [
 { projectId: "p-1", projectName: "AI Sales Copilot", riskScore: 42, impact: 3, likelihood: 2, category: "technical", status: "low", description: "Core AI integration is progressing well with minor API latency issues." },
 { projectId: "p-2", projectName: "Finance Automation", riskScore: 58, impact: 4, likelihood: 3, category: "schedule", status: "medium", description: "Integration with external banking APIs is behind schedule by 2 weeks." },
 { projectId: "p-3", projectName: "Mobile Dashboard", riskScore: 72, impact: 4, likelihood: 4, category: "resource", status: "high", description: "Key mobile developer is leaving mid-sprint. Need replacement urgently." },
 { projectId: "p-4", projectName: "Data Migration", riskScore: 65, impact: 5, likelihood: 3, category: "technical", status: "high", description: "Legacy data format incompatibility causing data loss in 3% of records." },
 { projectId: "p-5", projectName: "Customer Portal", riskScore: 35, impact: 2, likelihood: 3, category: "external", status: "low", description: "Third-party design agency deliverables on track." },
 { projectId: "p-6", projectName: "Compliance Update", riskScore: 80, impact: 5, likelihood: 4, category: "external", status: "critical", description: "New GDPR requirements may require architectural changes by Q1 deadline." },
 { projectId: "p-7", projectName: "Marketing Site Redesign", riskScore: 28, impact: 2, likelihood: 2, category: "budget", status: "low", description: "Within budget and ahead of schedule." },
 { projectId: "p-8", projectName: "API Gateway Migration", riskScore: 55, impact: 3, likelihood: 4, category: "technical", status: "medium", description: "Dependency on upstream team's timeline poses moderate risk." },
];

export const customerGrowth: CustomerGrowth = {
 total: 1284,
 newThisMonth: 42,
 churned: 8,
 growthRate: 3.3,
 predictedNextMonth: 1320,
 monthlyData: [
 { month: "Jan", total: 820, new: 38, churned: 6 },
 { month: "Feb", total: 870, new: 56, churned: 6 },
 { month: "Mar", total: 936, new: 72, churned: 6 },
 { month: "Apr", total: 1004, new: 74, churned: 6 },
 { month: "May", total: 1108, new: 112, churned: 8 },
 { month: "Jun", total: 1190, new: 90, churned: 8 },
 { month: "Jul", total: 1284, new: 102, churned: 8 },
 ],
 predictions: [
 { month: "Aug", actual: null, predicted: 1320, upperBound: 1360, lowerBound: 1280 },
 { month: "Sep", actual: null, predicted: 1360, upperBound: 1410, lowerBound: 1310 },
 { month: "Oct", actual: null, predicted: 1405, upperBound: 1465, lowerBound: 1345 },
 { month: "Nov", actual: null, predicted: 1450, upperBound: 1520, lowerBound: 1380 },
 { month: "Dec", actual: null, predicted: 1500, upperBound: 1580, lowerBound: 1420 },
 ],
};

export const financialTrends: FinancialTrend = {
 grossMargin: 72.4,
 netMargin: 18.2,
 burnRate: 194000,
 runwayMonths: 14,
 monthlyData: [
 { month: "Jan", revenue: 124000, expenses: 112000, grossMargin: 68.2, operatingExpenses: 32000, netIncome: 12000 },
 { month: "Feb", revenue: 138000, expenses: 121000, grossMargin: 69.5, operatingExpenses: 34000, netIncome: 17000 },
 { month: "Mar", revenue: 152000, expenses: 129000, grossMargin: 70.1, operatingExpenses: 35000, netIncome: 23000 },
 { month: "Apr", revenue: 171000, expenses: 138000, grossMargin: 70.8, operatingExpenses: 36000, netIncome: 33000 },
 { month: "May", revenue: 188000, expenses: 152000, grossMargin: 71.5, operatingExpenses: 38000, netIncome: 36000 },
 { month: "Jun", revenue: 206000, expenses: 176000, grossMargin: 72.0, operatingExpenses: 39000, netIncome: 30000 },
 { month: "Jul", revenue: 267000, expenses: 194000, grossMargin: 72.4, operatingExpenses: 42000, netIncome: 73000 },
 ],
};

export const departmentOptions = [
 { value: "all", label: "All Departments" },
 { value: "Engineering", label: "Engineering" },
 { value: "Sales", label: "Sales" },
 { value: "Marketing", label: "Marketing" },
 { value: "Operations", label: "Operations" },
 { value: "Finance", label: "Finance" },
 { value: "HR", label: "HR" },
];

export const metricOptions = [
 { value: "all", label: "All Metrics" },
 { value: "revenue", label: "Revenue" },
 { value: "expenses", label: "Expenses" },
 { value: "sales", label: "Sales" },
 { value: "customers", label: "Customers" },
 { value: "productivity", label: "Productivity" },
 { value: "risks", label: "Project Risks" },
 { value: "financial", label: "Financial Trends" },
];