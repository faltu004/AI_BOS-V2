import type { RequestHandler } from "express";
import { reportAIService } from "../services/report-ai.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { validate } from "../middleware/validate.middleware.js";
import { reportGenerateSchema, reportExportSchema, reportScheduleSchema } from "../validation/report-ai.validation.js";

export class ReportAIController {
  generateReport: RequestHandler = async (req, res) => {
    const result = await reportAIService.generateReport(req.body);
    sendSuccess(res, 200, { message: "Report generated", data: result });
  };

  exportReport: RequestHandler = async (req, res) => {
    const { report_id, format } = req.body;
    const data = await reportAIService.exportReport({ report_id, format });
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename=${report_id}.${format}`);
    res.send(data);
  };

  scheduleReport: RequestHandler = async (req, res) => {
    const result = await reportAIService.scheduleReport(req.body);
    sendSuccess(res, 200, { message: "Report scheduled", data: result });
  };

  listScheduledReports: RequestHandler = async (req, res) => {
    const reports = await reportAIService.getScheduledReports();
    sendSuccess(res, 200, { message: "Scheduled reports retrieved", data: reports });
  };

  deleteScheduledReport: RequestHandler = async (req, res) => {
    await reportAIService.deleteScheduledReport(req.params.reportId);
    sendSuccess(res, 200, { message: "Scheduled report deleted", data: null });
  };
}

export const reportAIController = new ReportAIController();