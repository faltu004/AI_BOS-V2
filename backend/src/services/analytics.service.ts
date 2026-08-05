import type { AnalyticsQueryInput } from "../validation/analytics.validation.js";
import { projectRepository } from "../repositories/project.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { leadRepository } from "../repositories/lead.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import type { AnalyticsSection, AnalyticsDateRange } from "../constants/analytics.js";

type AnalyticsFilters = {
  section: AnalyticsSection | undefined;
  dateRange: AnalyticsDateRange;
};

type AnalyticsExport = {
  sections: string[];
  format: "pdf" | "csv";
  dateRange: string;
};

export class AnalyticsService {
  async getSection(filters: AnalyticsFilters) {
    const section = filters.section ?? "overview";

    switch (section) {
      case "sales":
        return this.getSales();
      default:
        return this.getOverview();
    }
  }

  async exportAnalytics(payload: AnalyticsExport) {
    if (payload.format === "pdf") {
      return this.generatePDF(payload.sections, payload.dateRange);
    }
    return this.generateCSV(payload.sections, payload.dateRange);
  }

  private async getOverview() {
    const [projectStats, taskStats, users] = await Promise.all([
      projectRepository.stats(),
      taskRepository.stats(),
      userRepository.findMany({ isActive: true }),
    ]);

    const completedTasks = taskStats.byStatus.find((entry) => entry.status === "Completed")?.count ?? 0;
    const completionRate = taskStats.total > 0 ? Math.round((completedTasks / taskStats.total) * 100) : 0;

    return {
      section: "overview",
      data: {
        projects: {
          total: projectStats.total,
          active: projectStats.active,
          completed: projectStats.completed,
          delayed: projectStats.delayed,
        },
        tasks: {
          total: taskStats.total,
          completed: completedTasks,
          overdue: taskStats.overdue,
          completionRate,
          byStatus: taskStats.byStatus,
        },
        employees: {
          total: users.length,
          active: users.length,
        },
      },
    };
  }

  private async getSales() {
    const leadStats = await leadRepository.stats();
    const winRate = leadStats.totalValue > 0 ? Math.round((leadStats.wonValue / leadStats.totalValue) * 100) : 0;

    return {
      section: "sales",
      data: {
        totalLeads: leadStats.total,
        pipelineValue: leadStats.totalValue,
        wonValue: leadStats.wonValue,
        winRate,
        byStatus: leadStats.byStatus,
      },
    };
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
