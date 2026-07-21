import type { RequestHandler } from "express";
import { consultantService } from "../services/consultant.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { validate } from "../middleware/validate.middleware.js";
import type { ConsultantExportInput, ConsultantListQuery } from "../validation/consultant.validation.js";

export class ConsultantController {
  analyze: RequestHandler = async (req, res) => {
    const result = await consultantService.analyze(req.body, req.user?.id);
    sendSuccess(res, 201, { message: "Business analysis generated", data: result });
  };

  list: RequestHandler = async (req, res) => {
    const result = await consultantService.list(req.query as unknown as import("../validation/consultant.validation.js").ConsultantListQuery);
    sendSuccess(res, 200, { message: "Consultant reports fetched", data: result });
  };

  getById: RequestHandler = async (req, res) => {
    const report = await consultantService.getById(req.params.id);
    sendSuccess(res, 200, { message: "Report fetched", data: report });
  };

  delete: RequestHandler = async (req, res) => {
    const result = await consultantService.delete(req.params.id);
    sendSuccess(res, 200, { message: "Report deleted", data: result });
  };

  exportReport: RequestHandler = async (req, res) => {
    const result = await consultantService.exportReport(req.body as ConsultantExportInput);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename=consultant-report.${(req.body as ConsultantExportInput).format}`);
    res.status(200).send(result);
  };

  recent: RequestHandler = async (_req, res) => {
    const reports = await consultantService.getRecentReports();
    sendSuccess(res, 200, { message: "Recent reports fetched", data: reports });
  };
}

export const consultantController = new ConsultantController();
