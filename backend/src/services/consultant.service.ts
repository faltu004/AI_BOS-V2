import type { Types } from "mongoose";
import { consultantRepository } from "../repositories/consultant.repository.js";
import { AppError } from "../utils/app-error.js";
import { UserModel } from "../models/user.model.js";
import { ProjectModel } from "../models/project.model.js";
import { WorkflowModel } from "../models/workflow.model.js";
import { AIConfigModel } from "../models/ai-config.model.js";
import type {
  ConsultantAnalysisInput,
  ConsultantExportInput,
  ConsultantListQuery,
} from "../validation/consultant.validation.js";

type ConsultantMetric = {
  label: string;
  value: string | number;
  change?: string;
  source: string;
  confidence: number;
};

type ConsultantSection = {
  title: string;
  content: string;
  data?: Record<string, unknown>;
  sourceModules: string[];
  confidence: number;
};

type ConsultantRecommendation = {
  priority: "high" | "medium" | "low";
  category: string;
  action: string;
  impact: string;
  effort: string;
};

type ConsultantDataSource = {
  module: string;
  recordCount: number;
  available: boolean;
};

type RealBusinessData = {
  users: { total: number; byRole: Record<string, number>; recentLogins: number };
  projects: { total: number; active: number; delayed: number; completed: number; avgProgress: number; totalBudget: number; avgBudget: number };
  workflows: { total: number; active: number; paused: number; templates: number; totalExecutions: number };
  aiConfig: { configured: boolean; provider: string };
};

export class ConsultantService {
  async analyze(input: ConsultantAnalysisInput, userId?: string) {
    const realData = await this.loadRealData(input.includeModules);
    const { metrics, sections, recommendations, summary } = await this.generateAnalysis(input, realData);

    const report = await consultantRepository.create({
      title: this.buildTitle(input.type, input.period),
      type: input.type,
      period: input.period,
      status: "final",
      summary,
      metrics,
      sections,
      recommendations,
      dataSources: this.buildDataSources(realData),
      generatedBy: userId as unknown as Types.ObjectId,
    });

    return report;
  }

  async list(query: ConsultantListQuery) {
    return consultantRepository.list(query);
  }

  async getById(id: string) {
    const report = await consultantRepository.findById(id);
    if (!report) {
      throw new AppError("Consultant report not found", 404);
    }
    return report;
  }

  async delete(id: string) {
    const report = await consultantRepository.delete(id);
    if (!report) {
      throw new AppError("Consultant report not found", 404);
    }
    return { deleted: true };
  }

  async exportReport(_input: ConsultantExportInput) {
    const report = await this.getById(_input.reportId);
    return {
      format: _input.format,
      reportId: _input.reportId,
      title: report.title,
      generatedAt: new Date().toISOString(),
      message: `${_input.format.toUpperCase()} export generated successfully`,
      downloadUrl: `/api/v1/consultant/export/${_input.reportId}?format=${_input.format}`,
    };
  }

  async getRecentReports(limit = 5) {
    return consultantRepository.listRecent(limit);
  }

  private async loadRealData(modules: string[]): Promise<RealBusinessData> {
    const data: RealBusinessData = {
      users: { total: 0, byRole: {}, recentLogins: 0 },
      projects: { total: 0, active: 0, delayed: 0, completed: 0, avgProgress: 0, totalBudget: 0, avgBudget: 0 },
      workflows: { total: 0, active: 0, paused: 0, templates: 0, totalExecutions: 0 },
      aiConfig: { configured: false, provider: "none" },
    };

    if (modules.includes("users")) {
      const users = await UserModel.find({});
      data.users.total = users.length;
      data.users.byRole = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      data.users.recentLogins = users.filter((u) => u.lastLoginAt && Date.now() - new Date(u.lastLoginAt).getTime() < 7 * 24 * 60 * 60 * 1000).length;
    }

    if (modules.includes("projects")) {
      const projects = await ProjectModel.find({ isArchived: false }).lean();
      data.projects.total = projects.length;
      data.projects.active = projects.filter((p) => p.status === "Active").length;
      data.projects.delayed = projects.filter((p) => p.status === "Delayed").length;
      data.projects.completed = projects.filter((p) => p.status === "Completed").length;
      data.projects.avgProgress = projects.length ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;
      data.projects.totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
      data.projects.avgBudget = projects.length ? Math.round(projects.reduce((sum, p) => sum + p.budget, 0) / projects.length) : 0;
    }

    if (modules.includes("workflows")) {
      const workflows = await WorkflowModel.find({});
      data.workflows.total = workflows.length;
      data.workflows.active = workflows.filter((w) => w.status === "Active").length;
      data.workflows.paused = workflows.filter((w) => w.status === "Paused").length;
      data.workflows.templates = workflows.filter((w) => w.isTemplate).length;
      data.workflows.totalExecutions = workflows.reduce((sum, w) => sum + w.executionCount, 0);
    }

    if (modules.includes("ai-config")) {
      const aiConfig = await AIConfigModel.findOne({}).lean();
      data.aiConfig.configured = !!aiConfig;
      data.aiConfig.provider = aiConfig?.provider || "none";
    }

    return data;
  }

  private async generateAnalysis(input: ConsultantAnalysisInput, data: RealBusinessData): Promise<{
    metrics: ConsultantMetric[];
    sections: ConsultantSection[];
    recommendations: ConsultantRecommendation[];
    summary: string;
  }> {
    const type = input.type;
    const metrics = this.buildMetricsForType(type, data);
    const sections = this.buildSectionsForType(type, data);
    const recommendations = this.buildRecommendationsForType(type, data);
    const summary = this.buildSummaryForType(type, data);

    return { metrics, sections, recommendations, summary };
  }

  private buildTitle(type: string, period?: string): string {
    const titles: Record<string, string> = {
      business_health: "Business Health Analysis",
      swot: "SWOT Analysis",
      revenue: "Revenue Analysis",
      expense: "Expense Analysis",
      sales: "Sales Analysis",
      project: "Project Analysis",
      employee: "Employee Analysis",
      risk: "Risk Detection Report",
      suggestion: "Business Recommendations",
      summary: "Executive Summary",
    };
    const base = titles[type] || "Business Analysis";
    return period ? `${period.charAt(0).toUpperCase() + period.slice(1)} ${base}` : base;
  }

  private buildMetricsForType(type: string, data: RealBusinessData): ConsultantMetric[] {
    const metrics: ConsultantMetric[] = [];

    if (data.users.total > 0) {
      metrics.push({ label: "Total Users", value: data.users.total, source: "users", confidence: 90 });
      metrics.push({ label: "Active Roles", value: Object.keys(data.users.byRole).length, source: "users", confidence: 90 });
      metrics.push({ label: "Recent Logins (7d)", value: data.users.recentLogins, source: "users", confidence: 85 });
    }

    if (data.projects.total > 0) {
      metrics.push({ label: "Total Projects", value: data.projects.total, source: "projects", confidence: 95 });
      metrics.push({ label: "Active Projects", value: data.projects.active, source: "projects", confidence: 95 });
      metrics.push({ label: "Delayed Projects", value: data.projects.delayed, source: "projects", confidence: 95 });
      metrics.push({ label: "Completion Rate", value: `${Math.round((data.projects.completed / Math.max(1, data.projects.total)) * 100)}%`, source: "projects", confidence: 90 });
      metrics.push({ label: "Average Progress", value: `${data.projects.avgProgress}%`, source: "projects", confidence: 90 });
      metrics.push({ label: "Total Budget", value: `$${data.projects.totalBudget.toLocaleString()}`, source: "projects", confidence: 90 });
      metrics.push({ label: "Average Budget", value: `$${data.projects.avgBudget.toLocaleString()}`, source: "projects", confidence: 85 });
    }

    if (data.workflows.total > 0) {
      metrics.push({ label: "Active Workflows", value: data.workflows.active, source: "workflows", confidence: 95 });
      metrics.push({ label: "Paused Workflows", value: data.workflows.paused, source: "workflows", confidence: 95 });
      metrics.push({ label: "Total Executions", value: data.workflows.totalExecutions, source: "workflows", confidence: 90 });
      metrics.push({ label: "Templates", value: data.workflows.templates, source: "workflows", confidence: 90 });
    }

    if (data.aiConfig.configured) {
      metrics.push({ label: "AI Provider", value: data.aiConfig.provider, source: "ai-config", confidence: 100 });
    }

    if (metrics.length === 0) {
      metrics.push({ label: "Data Availability", value: "Limited", source: "system", confidence: 100 });
    }

    return metrics;
  }

  private buildSectionsForType(type: string, data: RealBusinessData): ConsultantSection[] {
    const sections: ConsultantSection[] = [];

    if (type === "business_health" || type === "summary") {
      sections.push({
        title: "Business Overview",
        content: data.projects.total > 0
          ? `Organization has ${data.users.total} users across ${Object.keys(data.users.byRole).length} roles, ${data.projects.total} projects (${data.projects.active} active, ${data.projects.delayed} delayed), and ${data.workflows.total} workflows (${data.workflows.active} active). Average project progress is ${data.projects.avgProgress}% with a total budget of $${data.projects.totalBudget.toLocaleString()}.`
          : "Insufficient data for comprehensive business health assessment. Ensure backend models exist for finance, CRM, employees, products, meetings, and documents.",
        sourceModules: data.projects.total > 0 ? ["users", "projects", "workflows"] : [],
        confidence: data.projects.total > 0 ? 70 : 30,
      });

      if (data.projects.total > 0) {
        const healthScore = Math.max(0, Math.min(100, 100 - data.projects.delayed * 5 - (100 - data.projects.avgProgress) * 0.2));
        sections.push({
          title: "Business Health Score",
          content: `Calculated health score: ${Math.round(healthScore)}/100. ${healthScore >= 70 ? "Business is performing well." : healthScore >= 40 ? "Business needs attention in key areas." : "Immediate intervention required."}`,
          sourceModules: ["projects"],
          confidence: 60,
          data: { score: Math.round(healthScore), maxScore: 100 },
        });
      }
    }

    if (type === "swot") {
      sections.push({
        title: "Strengths",
        content: data.projects.total > 0
          ? `- ${data.projects.active} active projects showing operational capacity\n- ${data.workflows.active} active automation workflows\n- ${data.users.byRole["Admin"] || 0} admin users for governance\n- Project completion rate: ${Math.round((data.projects.completed / Math.max(1, data.projects.total)) * 100)}%`
          : "Data not available for SWOT analysis.",
        sourceModules: data.projects.total > 0 ? ["projects", "workflows"] : [],
        confidence: data.projects.total > 0 ? 60 : 20,
      });
      sections.push({
        title: "Weaknesses",
        content: data.projects.total > 0
          ? `- ${data.projects.delayed} delayed projects indicate planning or resource gaps\n- Average project progress at ${data.projects.avgProgress}% suggests execution challenges\n- ${data.workflows.paused} paused workflows may indicate process issues`
          : "Data not available for SWOT analysis.",
        sourceModules: data.projects.total > 0 ? ["projects", "workflows"] : [],
        confidence: data.projects.total > 0 ? 60 : 20,
      });
    }

    if (type === "revenue" || type === "expense" || type === "sales") {
      sections.push({
        title: "Data Availability Notice",
        content: "Finance, CRM, and sales data models are not yet connected to the backend. This analysis requires backend models for invoices, expenses, leads, and deals. Currently showing only project and workflow data.",
        sourceModules: [],
        confidence: 0,
      });
    }

    if (type === "project") {
      sections.push({
        title: "Project Performance",
        content: data.projects.total > 0
          ? `${data.projects.total} total projects: ${data.projects.active} active, ${data.projects.completed} completed, ${data.projects.delayed} delayed. Average progress: ${data.projects.avgProgress}%. Total budget allocated: $${data.projects.totalBudget.toLocaleString()}.`
          : "No project data available.",
        sourceModules: data.projects.total > 0 ? ["projects"] : [],
        confidence: data.projects.total > 0 ? 90 : 20,
      });
      if (data.projects.delayed > 0) {
        sections.push({
          title: "Delayed Projects Alert",
          content: `${data.projects.delayed} project(s) are currently delayed. Review timelines, resource allocation, and blockers immediately.`,
          sourceModules: ["projects"],
          confidence: 90,
        });
      }
    }

    if (type === "employee") {
      sections.push({
        title: "Data Availability Notice",
        content: "Employee data model is not yet connected to the backend. This analysis requires a backend model for employee records, attendance, leave, and performance data.",
        sourceModules: [],
        confidence: 0,
      });
    }

    if (type === "risk") {
      sections.push({
        title: "Project Risk Assessment",
        content: data.projects.total > 0
          ? `${data.projects.delayed} out of ${data.projects.total} projects are delayed. ${data.projects.avgProgress < 50 ? "Average progress below 50% indicates execution risk." : "Progress is within acceptable range."}`
          : "No project data available for risk assessment.",
        sourceModules: data.projects.total > 0 ? ["projects"] : [],
        confidence: data.projects.total > 0 ? 85 : 20,
      });
    }

    if (type === "suggestion") {
      sections.push({
        title: "Data-Driven Suggestions",
        content: data.projects.total > 0
          ? `Based on ${data.projects.total} projects and ${data.workflows.total} workflows: Focus on completing delayed projects, optimize workflow automation, and improve project tracking to increase on-time delivery.`
          : "Insufficient data to generate actionable suggestions. Connect additional backend modules.",
        sourceModules: data.projects.total > 0 ? ["projects", "workflows"] : [],
        confidence: data.projects.total > 0 ? 60 : 20,
      });
    }

    if (sections.length === 0) {
      sections.push({
        title: "Analysis Results",
        content: data.projects.total > 0
          ? `Analysis completed with ${data.projects.total} projects and ${data.workflows.total} workflows available.`
          : "No data available for analysis.",
        sourceModules: data.projects.total > 0 ? ["projects", "workflows"] : [],
        confidence: data.projects.total > 0 ? 60 : 20,
      });
    }

    return sections;
  }

  private buildRecommendationsForType(type: string, data: RealBusinessData): ConsultantRecommendation[] {
    const recommendations: ConsultantRecommendation[] = [];

    if (data.projects.delayed > 0) {
      recommendations.push({
        priority: "high",
        category: "project",
        action: `Address ${data.projects.delayed} delayed project(s) immediately. Review resource allocation, dependencies, and timelines.`,
        impact: "Prevent further delays and budget overruns",
        effort: "Medium",
      });
    }

    if (data.projects.avgProgress < 50 && data.projects.total > 0) {
      recommendations.push({
        priority: "medium",
        category: "project",
        action: "Improve project tracking and increase status review frequency. Consider weekly standups for at-risk projects.",
        impact: "Better on-time delivery and visibility",
        effort: "Low",
      });
    }

    if (data.workflows.total > 0 && data.workflows.paused > 0) {
      recommendations.push({
        priority: "low",
        category: "automation",
        action: `Review ${data.workflows.paused} paused workflow(s) and determine if they should be resumed or archived.`,
        impact: "Streamline operations and reduce clutter",
        effort: "Low",
      });
    }

    if (data.users.byRole["Employee"] && data.users.byRole["Employee"] > 10) {
      recommendations.push({
        priority: "medium",
        category: "operations",
        action: "Consider implementing self-service portals to reduce administrative overhead.",
        impact: "Improved employee experience and efficiency",
        effort: "Medium",
      });
    }

    recommendations.push({
      priority: "high",
      category: "data",
      action: "Connect backend models for Finance, CRM, Employees, Products, Meetings, and Documents to enable comprehensive AI analysis.",
      impact: "Unlock full business intelligence capabilities",
      effort: "High",
    });

    return recommendations;
  }

  private buildSummaryForType(type: string, data: RealBusinessData): string {
    const parts: string[] = [];
    if (data.users.total > 0) parts.push(`${data.users.total} users across ${Object.keys(data.users.byRole).length} roles`);
    if (data.projects.total > 0) parts.push(`${data.projects.active} active projects, ${data.projects.delayed} delayed`);
    if (data.workflows.total > 0) parts.push(`${data.workflows.active} active workflows`);
    if (parts.length === 0) return "Insufficient data available for analysis. Ensure backend models exist for requested modules.";

    const typeLabel = type.replace(/_/g, " ");
    return `${typeLabel} analysis based on ${parts.join(", ")}. Confidence: ${data.projects.total > 0 ? "moderate" : "low"}. Some modules require backend integration for full coverage.`;
  }

  private buildDataSources(data: RealBusinessData): ConsultantDataSource[] {
    const sources: ConsultantDataSource[] = [];

    sources.push({
      module: "users",
      recordCount: data.users.total,
      available: data.users.total > 0,
    });

    sources.push({
      module: "projects",
      recordCount: data.projects.total,
      available: data.projects.total > 0,
    });

    sources.push({
      module: "workflows",
      recordCount: data.workflows.total,
      available: data.workflows.total > 0,
    });

    sources.push({
      module: "ai-config",
      recordCount: data.aiConfig.configured ? 1 : 0,
      available: data.aiConfig.configured,
    });

    return sources;
  }
}

export const consultantService = new ConsultantService();
