import type { RequestHandler } from "express";
import { analyticsService } from "../services/analytics.service.js";
import { sendSuccess } from "../utils/api-response.js";
import type { AnalyticsSection, AnalyticsDateRange } from "../constants/analytics.js";

export class AnalyticsController {
  getSection: RequestHandler = async (req, res) => {
    const query = req.query as unknown as {
      section?: AnalyticsSection;
      dateRange?: AnalyticsDateRange;
    };
    const result = await analyticsService.getSection({
      section: query.section,
      dateRange: query.dateRange ?? "12m",
    });
    sendSuccess(res, 200, { message: "Analytics section fetched", data: result });
  };

  exportAnalytics: RequestHandler = async (req, res) => {
    const result = await analyticsService.exportAnalytics(req.body);
    sendSuccess(res, 200, { message: "Analytics export ready", data: result });
  };
}

export const analyticsController = new AnalyticsController();
