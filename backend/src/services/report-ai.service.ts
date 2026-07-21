import type { ReportExportInput, ReportGenerateInput, ReportScheduleInput } from "../validation/report-ai.validation.js";

type ReportSection = {
  type: "chart" | "table" | "summary" | "insights";
  title: string;
  data: Record<string, unknown>;
  aiInsights?: string;
};

type ReportResponse = {
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

type ScheduledReport = {
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

export class ReportAIService {
  private scheduledReports: Map<string, ScheduledReport> = new Map();

  async generateReport(data: ReportGenerateInput): Promise<ReportResponse> {
    const sections = this.buildSections(data.report_type, data.sections);
    const aiSummary = this.generateAISummary(data.report_type);
    const recommendations = this.generateRecommendations(data.report_type);
    const insights = this.generateInsights(data.report_type);

    const reportId = `report_${data.report_type}_${Date.now()}`;

    return {
      id: reportId,
      reportType: data.report_type,
      format: data.format,
      sections,
      aiSummary,
      recommendations,
      insights,
      downloadUrl: `/api/v1/reports/export/${reportId}`,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildSections(reportType: string, requestedSections: string[]): ReportSection[] {
    const sections: ReportSection[] = [];

    if (reportType === "finance") {
      if (!requestedSections.length || requestedSections.includes("revenue")) {
        sections.push({
          type: "chart",
          title: "Revenue vs Expenses",
          data: {
            type: "line",
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [
              { label: "Revenue", data: [45000, 52000, 48000, 61000, 55000, 67000] },
              { label: "Expenses", data: [32000, 35000, 33000, 38000, 36000, 41000] },
            ],
          },
          aiInsights: "Revenue increased 15% QoQ with expenses growing at 8%. Profit margin improved from 28% to 32%.",
        });
      }
      if (!requestedSections.length || requestedSections.includes("invoices")) {
        sections.push({
          type: "table",
          title: "Invoice Status",
          data: {
            headers: ["Invoice", "Customer", "Amount", "Status", "Due Date"],
            rows: [
              ["INV-001", "Acme Corp", "$12,500", "Paid", "2026-07-15"],
              ["INV-002", "TechStart Inc", "$8,200", "Pending", "2026-07-20"],
              ["INV-003", "Global Ltd", "$15,800", "Overdue", "2026-07-10"],
            ],
          },
          aiInsights: "3 invoices overdue totaling $15,800. Follow up with Global Ltd immediately.",
        });
      }
    } else if (reportType === "projects") {
      if (!requestedSections.length || requestedSections.includes("overview")) {
        sections.push({
          type: "chart",
          title: "Project Status Overview",
          data: {
            type: "pie",
            labels: ["Active", "Completed", "On Hold", "Delayed"],
            datasets: [{ data: [8, 12, 2, 1] }],
          },
          aiInsights: "13 active projects, 12 completed this quarter. 1 project delayed due to resource constraints.",
        });
      }
      if (!requestedSections.length || requestedSections.includes("budget")) {
        sections.push({
          type: "table",
          title: "Project Budget Utilization",
          data: {
            headers: ["Project", "Budget", "Spent", "Remaining", "Status"],
            rows: [
              ["Website Redesign", "$50,000", "$45,000", "$5,000", "On Track"],
              ["Mobile App", "$80,000", "$72,000", "$8,000", "At Risk"],
              ["API Integration", "$30,000", "$28,000", "$2,000", "On Track"],
            ],
          },
          aiInsights: "Mobile App project at 90% utilization. Consider budget increase or scope reduction.",
        });
      }
    } else if (reportType === "crm") {
      if (!requestedSections.length || requestedSections.includes("pipeline")) {
        sections.push({
          type: "chart",
          title: "Sales Pipeline",
          data: {
            type: "bar",
            labels: ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won"],
            datasets: [{ label: "Leads", data: [45, 32, 28, 15, 8, 12] }],
          },
          aiInsights: "Conversion rate from Qualified to Won is 18%. Focus on proposal stage to improve closure.",
        });
      }
      if (!requestedSections.length || requestedSections.includes("deals")) {
        sections.push({
          type: "table",
          title: "Top Deals",
          data: {
            headers: ["Deal", "Company", "Value", "Stage", "Close Date"],
            rows: [
              ["Enterprise License", "Acme Corp", "$125,000", "Negotiation", "2026-08-15"],
              ["Platform Upgrade", "TechStart", "$85,000", "Proposal", "2026-08-30"],
              ["Annual Contract", "Global Ltd", "$200,000", "Won", "2026-07-01"],
            ],
          },
          aiInsights: "Pipeline value: $410K. Expected closure in Q3: $285K.",
        });
      }
    } else if (reportType === "employees") {
      if (!requestedSections.length || requestedSections.includes("headcount")) {
        sections.push({
          type: "chart",
          title: "Headcount by Department",
          data: {
            type: "bar",
            labels: ["Engineering", "Sales", "Marketing", "Operations", "HR"],
            datasets: [{ label: "Employees", data: [45, 28, 15, 22, 8] }],
          },
          aiInsights: "Engineering team grew 20% this quarter. Sales team at full capacity.",
        });
      }
      if (!requestedSections.length || requestedSections.includes("attendance")) {
        sections.push({
          type: "table",
          title: "Attendance Summary",
          data: {
            headers: ["Department", "Present", "Absent", "On Leave", "Rate"],
            rows: [
              ["Engineering", "42", "2", "1", "93.3%"],
              ["Sales", "26", "1", "1", "92.8%"],
              ["Marketing", "14", "0", "1", "93.3%"],
            ],
          },
          aiInsights: "Overall attendance rate: 93.2%. 5 employees on leave this week.",
        });
      }
    } else if (reportType === "meetings") {
      if (!requestedSections.length || requestedSections.includes("frequency")) {
        sections.push({
          type: "chart",
          title: "Meeting Frequency",
          data: {
            type: "bar",
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            datasets: [{ label: "Meetings", data: [8, 12, 10, 9, 6] }],
          },
          aiInsights: "Peak meeting day: Tuesday (12 meetings). Consider reducing Wednesday meetings.",
        });
      }
      if (!requestedSections.length || requestedSections.includes("action_items")) {
        sections.push({
          type: "table",
          title: "Action Items Completion",
          data: {
            headers: ["Meeting", "Action Items", "Completed", "Pending", "Rate"],
            rows: [
              ["Q2 Review", "8", "7", "1", "87.5%"],
              ["Product Sync", "5", "5", "0", "100%"],
              ["Client Call", "3", "2", "1", "66.7%"],
            ],
          },
          aiInsights: "Overall action item completion rate: 85%. 3 items overdue.",
        });
      }
    } else if (reportType === "customers") {
      if (!requestedSections.length || requestedSections.includes("growth")) {
        sections.push({
          type: "chart",
          title: "Customer Growth",
          data: {
            type: "line",
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [{ label: "Total Customers", data: [120, 135, 148, 162, 178, 195] }],
          },
          aiInsights: "Net growth: 75 customers (62.5% increase). Churn rate: 2.1%.",
        });
      }
      if (!requestedSections.length || requestedSections.includes("revenue")) {
        sections.push({
          type: "table",
          title: "Top Customers by Revenue",
          data: {
            headers: ["Customer", "Revenue", "Health", "Trend"],
            rows: [
              ["Acme Corp", "$125,000", "Excellent", "↑"],
              ["TechStart Inc", "$95,000", "Good", "↑"],
              ["Global Ltd", "$180,000", "Excellent", "→"],
            ],
          },
          aiInsights: "Top 3 customers contribute 45% of total revenue. Focus on retention.",
        });
      }
    } else if (reportType === "business_performance") {
      if (!requestedSections.length || requestedSections.includes("health")) {
        sections.push({
          type: "chart",
          title: "Business Health Score",
          data: {
            type: "gauge",
            value: 74,
            max: 100,
            label: "Overall Health",
          },
          aiInsights: "Business health: Good (74/100). Strong revenue growth, needs expense control improvement.",
        });
      }
      if (!requestedSections.length || requestedSections.includes("productivity")) {
        sections.push({
          type: "chart",
          title: "Productivity Metrics",
          data: {
            type: "radar",
            labels: ["Revenue", "Customer Satisfaction", "Employee Performance", "Project Delivery", "Innovation"],
            datasets: [{ label: "Current", data: [85, 78, 82, 75, 70] }],
          },
          aiInsights: "Revenue and employee performance are strong. Innovation and project delivery need attention.",
        });
      }
    }

    return sections;
  }

  private generateAISummary(reportType: string): string {
    const summaries: Record<string, string> = {
      finance: "Financial performance remains strong with 15% revenue growth. Expenses are well-controlled at 8% increase. Profit margins improved to 32%. 3 invoices overdue requiring immediate attention.",
      projects: "13 active projects with 12 completed this quarter. Overall project health is good with 85% on-time delivery. Mobile App project needs attention at 90% budget utilization.",
      crm: "Sales pipeline healthy with $410K value. Conversion rate improved to 18%. 12 deals won this quarter. Focus on proposal stage to improve closure rate.",
      employees: "Total headcount: 118 employees across 5 departments. Attendance rate: 93.2%. Engineering team grew 20%. 5 employees on leave this week.",
      meetings: "52 meetings this month with 85% action item completion. Tuesday is peak meeting day. Average meeting duration: 45 minutes. 3 action items overdue.",
      customers: "195 total customers with 62.5% growth this quarter. Churn rate: 2.1%. Top 3 customers contribute 45% of revenue. Customer health: 78% Excellent/Good.",
      business_performance: "Overall business health: Good (74/100). Strong revenue growth and employee performance. Areas for improvement: expense control, project delivery, and innovation.",
    };
    return summaries[reportType] || "Report generated successfully.";
  }

  private generateRecommendations(reportType: string): string[] {
    const recommendations: Record<string, string[]> = {
      finance: [
        "Follow up with Global Ltd on overdue invoice ($15,800)",
        "Reduce marketing spend by 10% and reallocate to engineering",
        "Implement automated invoice reminders to reduce overdue payments",
      ],
      projects: [
        "Reallocate resources to Mobile App project to meet deadline",
        "Review and approve budget increase for delayed projects",
        "Implement weekly status reviews for at-risk projects",
      ],
      crm: [
        "Focus on qualified leads in proposal stage to improve conversion",
        "Schedule follow-up with 8 leads in negotiation stage",
        "Implement lead scoring to prioritize high-value prospects",
      ],
      employees: [
        "Review leave policy for Q4 to prevent burnout",
        "Consider hiring 2 additional engineers for growing team",
        "Implement flexible work hours to improve work-life balance",
      ],
      meetings: [
        "Reduce meeting duration by 15% to improve productivity",
        "Schedule important meetings on Tuesday 10am for best attendance",
        "Implement meeting-free Wednesdays to focus on deep work",
      ],
      customers: [
        "Focus on at-risk customers to reduce churn",
        "Implement customer success program for top 20 accounts",
        "Create referral program to leverage satisfied customers",
      ],
      business_performance: [
        "Improve expense control to increase profit margins",
        "Invest in project management tools to improve delivery",
        "Allocate 10% of budget to R&D for innovation",
      ],
    };
    return recommendations[reportType] || [];
  }

  private generateInsights(reportType: string): string[] {
    const insights: Record<string, string[]> = {
      finance: [
        "Best performing month: March ($61K revenue)",
        "Marketing ROI: 3.2x (highest among departments)",
        "Tax liability estimated at $45K for Q2",
      ],
      projects: [
        "Average project duration: 45 days",
        "Engineering projects have 92% on-time delivery rate",
        "Client projects average 15% over budget",
      ],
      crm: [
        "Best performing channel: Referrals (28% conversion)",
        "Average deal size: $68K",
        "Sales cycle length: 45 days",
      ],
      employees: [
        "Engineering has highest overtime: 12 hours/week average",
        "Employee satisfaction score: 4.2/5.0",
        "Average tenure: 2.5 years",
      ],
      meetings: [
        "Best meeting time: Tuesday 10am (94% attendance)",
        "Average action items per meeting: 4.2",
        "Meeting satisfaction score: 3.8/5.0",
      ],
      customers: [
        "Top customer: Acme Corp ($125K revenue)",
        "Customer acquisition cost: $1,250",
        "Customer lifetime value: $45,000",
      ],
      business_performance: [
        "Strong growth projected for Q3: 20% revenue increase",
        "Employee productivity up 12% year-over-year",
        "Customer satisfaction at all-time high: 4.5/5.0",
      ],
    };
    return insights[reportType] || [];
  }

  async exportReport(data: ReportExportInput): Promise<Buffer> {
    return Buffer.from("PLACEHOLDER");
  }

  async scheduleReport(data: ReportScheduleInput): Promise<ScheduledReport> {
    const reportId = `sched_${data.report_type}_${Date.now()}`;
    const scheduledReport: ScheduledReport = {
      id: reportId,
      reportType: data.report_type,
      format: data.format,
      frequency: data.frequency,
      recipients: data.recipients,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.scheduledReports.set(reportId, scheduledReport);
    return scheduledReport;
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    return Array.from(this.scheduledReports.values());
  }

  async deleteScheduledReport(reportId: string): Promise<void> {
    this.scheduledReports.delete(reportId);
  }
}

export const reportAIService = new ReportAIService();