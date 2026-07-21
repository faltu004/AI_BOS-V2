import type {
  AnalyticsQueryInput,
  AnalyticsExportInput,
} from "../validation/analytics.validation.js";
import { AppError } from "../utils/app-error.js";
import type { AnalyticsSection, AnalyticsDateRange } from "../constants/analytics.js";

type AnalyticsFilters = {
  section: AnalyticsSection | undefined;
  dateRange: AnalyticsDateRange;
  department: string | undefined;
  metric: string | undefined;
};

type AnalyticsExport = {
  sections: string[];
  format: "pdf" | "csv";
  dateRange: string;
};

export class AnalyticsService {
  async getSection(filters: AnalyticsFilters) {
    const section = filters.section ?? "health-score";

    switch (section) {
      case "health-score":
        return this.getHealthScore();
      case "revenue":
        return this.getRevenuePrediction(filters.dateRange);
      case "expenses":
        return this.getExpensePrediction(filters.dateRange);
      case "sales":
        return this.getSalesForecast(filters.dateRange);
      case "productivity":
        return this.getProductivity(filters.department, filters.dateRange);
      case "risks":
        return this.getProjectRisks(filters.dateRange);
      case "customers":
        return this.getCustomerGrowth(filters.dateRange);
      case "financial":
        return this.getFinancialTrends(filters.dateRange);
      default:
        return this.getHealthScore();
    }
  }

  async exportAnalytics(payload: AnalyticsExport) {
    if (payload.format === "pdf") {
      return this.generatePDF(payload.sections, payload.dateRange);
    }
    return this.generateCSV(payload.sections, payload.dateRange);
  }

  private getHealthScore() {
    return {
      section: "health-score",
      data: {
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
      },
    };
  }

  private getRevenuePrediction(dateRange: AnalyticsDateRange) {
    const months = dateRange === "all" ? 12 : Number(dateRange.replace("m", ""));
    const predictions = this.generatePredictionData(months, 124000, 0.12, 0.04);
    const current = predictions[predictions.length - 1];
    const previous = predictions[predictions.length - 2] ?? predictions[0];

    return {
      section: "revenue",
      data: {
        currentMonth: current.actual ?? current.predicted ?? 0,
        lastMonth: previous.actual ?? previous.predicted ?? 0,
        change: previous.actual || previous.predicted ? ((current.actual ?? current.predicted ?? 0) / (previous.actual ?? previous.predicted ?? 1) - 1) * 100 : 0,
        nextMonth: current.predicted ? current.predicted * 1.08 : 0,
        quarterlyForecast: (current.predicted ?? 0) * 3,
        predictions,
      },
    };
  }

  private getExpensePrediction(dateRange: AnalyticsDateRange) {
    const months = dateRange === "all" ? 12 : Number(dateRange.replace("m", ""));
    const predictions = this.generatePredictionData(months, 112000, 0.08, 0.03);
    const current = predictions[predictions.length - 1];
    const previous = predictions[predictions.length - 2] ?? predictions[0];

    return {
      section: "expenses",
      data: {
        currentMonth: current.actual ?? current.predicted ?? 0,
        lastMonth: previous.actual ?? previous.predicted ?? 0,
        change: previous.actual || previous.predicted ? ((current.actual ?? current.predicted ?? 0) / (previous.actual ?? previous.predicted ?? 1) - 1) * 100 : 0,
        projectedNextMonth: current.predicted ? current.predicted * 1.07 : 0,
        topCategories: [
          { category: "Payroll", amount: 98000, percentage: 50.5 },
          { category: "Infrastructure", amount: 32000, percentage: 16.5 },
          { category: "Marketing", amount: 28000, percentage: 14.4 },
          { category: "Operations", amount: 22000, percentage: 11.3 },
          { category: "R&D", amount: 14000, percentage: 7.2 },
        ],
        predictions,
      },
    };
  }

  private getSalesForecast(_dateRange: AnalyticsDateRange) {
    return {
      section: "sales",
      data: {
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
      },
    };
  }

  private getProductivity(department: string | undefined, _dateRange: AnalyticsDateRange) {
    const departments = [
      { department: "Engineering", score: 82, tasksCompleted: 142, tasksAssigned: 168, completionRate: 84.5, trend: "up" as const },
      { department: "Sales", score: 79, tasksCompleted: 98, tasksAssigned: 124, completionRate: 79.0, trend: "up" as const },
      { department: "Marketing", score: 71, tasksCompleted: 76, tasksAssigned: 108, completionRate: 70.4, trend: "stable" as const },
      { department: "Operations", score: 74, tasksCompleted: 64, tasksAssigned: 86, completionRate: 74.4, trend: "up" as const },
      { department: "Finance", score: 68, tasksCompleted: 48, tasksAssigned: 70, completionRate: 68.6, trend: "down" as const },
      { department: "HR", score: 77, tasksCompleted: 52, tasksAssigned: 66, completionRate: 78.8, trend: "stable" as const },
    ];

    const filtered = department && department !== "all" ? departments.filter((d) => d.department === department) : departments;
    const overall = filtered.length ? Math.round(filtered.reduce((sum, d) => sum + d.score, 0) / filtered.length) : 0;

    return {
      section: "productivity",
      data: {
        overall,
        departments: filtered,
        monthlyData: [
          { month: "Jan", departments: { Engineering: 72, Sales: 68, Marketing: 65, Operations: 70, Finance: 64, HR: 71 } },
          { month: "Feb", departments: { Engineering: 74, Sales: 70, Marketing: 66, Operations: 71, Finance: 65, HR: 72 } },
          { month: "Mar", departments: { Engineering: 76, Sales: 72, Marketing: 68, Operations: 72, Finance: 66, HR: 73 } },
          { month: "Apr", departments: { Engineering: 78, Sales: 74, Marketing: 69, Operations: 72, Finance: 67, HR: 74 } },
          { month: "May", departments: { Engineering: 80, Sales: 76, Marketing: 70, Operations: 73, Finance: 68, HR: 75 } },
          { month: "Jun", departments: { Engineering: 81, Sales: 78, Marketing: 71, Operations: 74, Finance: 68, HR: 76 } },
          { month: "Jul", departments: { Engineering: 82, Sales: 79, Marketing: 71, Operations: 74, Finance: 68, HR: 77 } },
        ],
      },
    };
  }

  private getProjectRisks(_dateRange: AnalyticsDateRange) {
    return {
      section: "risks",
      data: [
        { projectId: "p-1", projectName: "AI Sales Copilot", riskScore: 42, impact: 3, likelihood: 2, category: "technical", status: "low", description: "Core AI integration is progressing well with minor API latency issues." },
        { projectId: "p-2", projectName: "Finance Automation", riskScore: 58, impact: 4, likelihood: 3, category: "schedule", status: "medium", description: "Integration with external banking APIs is behind schedule by 2 weeks." },
        { projectId: "p-3", projectName: "Mobile Dashboard", riskScore: 72, impact: 4, likelihood: 4, category: "resource", status: "high", description: "Key mobile developer is leaving mid-sprint. Need replacement urgently." },
        { projectId: "p-4", projectName: "Data Migration", riskScore: 65, impact: 5, likelihood: 3, category: "technical", status: "high", description: "Legacy data format incompatibility causing data loss in 3% of records." },
        { projectId: "p-5", projectName: "Customer Portal", riskScore: 35, impact: 2, likelihood: 3, category: "external", status: "low", description: "Third-party design agency deliverables on track." },
        { projectId: "p-6", projectName: "Compliance Update", riskScore: 80, impact: 5, likelihood: 4, category: "external", status: "critical", description: "New GDPR requirements may require architectural changes by Q1 deadline." },
        { projectId: "p-7", projectName: "Marketing Site Redesign", riskScore: 28, impact: 2, likelihood: 2, category: "budget", status: "low", description: "Within budget and ahead of schedule." },
        { projectId: "p-8", projectName: "API Gateway Migration", riskScore: 55, impact: 3, likelihood: 4, category: "technical", status: "medium", description: "Dependency on upstream team's timeline poses moderate risk." },
      ],
    };
  }

  private getCustomerGrowth(_dateRange: AnalyticsDateRange) {
    return {
      section: "customers",
      data: {
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
      },
    };
  }

  private getFinancialTrends(_dateRange: AnalyticsDateRange) {
    return {
      section: "financial",
      data: {
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
      },
    };
  }

  private generatePredictionData(months: number, baseValue: number, growthRate: number, noise: number) {
    const data: { month: string; actual: number | null; predicted: number | null; upperBound?: number | null; lowerBound?: number | null }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();

    for (let i = 0; i < months; i++) {
      const monthIndex = (currentMonth - months + i + 12) % 12;
      const monthName = monthNames[monthIndex];
      const trendFactor = 1 + growthRate * (i / months);
      const seasonalFactor = 1 + 0.05 * Math.sin((i / months) * Math.PI * 2);
      const value = Math.round(baseValue * trendFactor * seasonalFactor);

      if (i < months - 3) {
        data.push({ month: monthName, actual: value, predicted: null });
      } else if (i < months) {
        const upper = Math.round(value * (1 + noise));
        const lower = Math.round(value * (1 - noise));
        data.push({ month: monthName, actual: null, predicted: value, upperBound: upper, lowerBound: lower });
      }
    }

    return data;
  }

  private async generatePDF(sections: string[], dateRange: string) {
    return {
      format: "pdf",
      sections,
      dateRange,
      message: "PDF export generated successfully",
      downloadUrl: `/api/v1/analytics/export/pdf?sections=${sections.join(",")}&dateRange=${dateRange}`,
    };
  }

  private async generateCSV(sections: string[], dateRange: string) {
    return {
      format: "csv",
      sections,
      dateRange,
      message: "CSV export generated successfully",
      downloadUrl: `/api/v1/analytics/export/csv?sections=${sections.join(",")}&dateRange=${dateRange}`,
    };
  }
}

export const analyticsService = new AnalyticsService();