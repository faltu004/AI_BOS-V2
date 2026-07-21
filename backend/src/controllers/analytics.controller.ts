import type { RequestHandler } from "express";
import { analyticsService } from "../services/analytics.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { validate } from "../middleware/validate.middleware.js";
import { analyticsQuerySchema, analyticsExportSchema } from "../validation/analytics.validation.js";

export class AnalyticsController {
  getSection: RequestHandler = async (req, res) => {
    const query = req.query as unknown as {
      section?: "health-score" | "revenue" | "expenses" | "sales" | "productivity" | "risks" | "customers" | "financial";
      dateRange?: "3m" | "6m" | "12m" | "all";
      department?: string;
      metric?: string;
    };
    const result = await analyticsService.getSection({
      section: query.section,
      dateRange: query.dateRange ?? "12m",
      department: query.department,
      metric: query.metric,
    });
    sendSuccess(res, 200, { message: "Analytics section fetched", data: result });
  };

  exportAnalytics: RequestHandler = async (req, res) => {
    const result = await analyticsService.exportAnalytics(req.body);
    sendSuccess(res, 200, { message: "Analytics export ready", data: result });
  };
}

export const analyticsController = new AnalyticsController();