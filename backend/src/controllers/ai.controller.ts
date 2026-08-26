import type { Request, RequestHandler } from "express";
import { aiService } from "../services/ai.service.js";
import type { AIChatInput, AIDeviceGuidanceInput } from "../validation/ai.validation.js";
import { sendSuccess } from "../utils/api-response.js";

function requestMetadata(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export class AIController {
  status: RequestHandler = async (req, res) => {
    const data = await aiService.getStatus(req.user!.id, req.user!.role);
    sendSuccess(res, 200, { message: "AI status fetched", data });
  };

  context: RequestHandler = async (req, res) => {
    const data = await aiService.getContext(req.user!.id, req.user!.role);
    sendSuccess(res, 200, { message: "AI operational context fetched", data });
  };

  query: RequestHandler = async (req, res) => {
    const data = await aiService.query(
      req.body as AIChatInput,
      req.user!.id,
      req.user!.role,
      requestMetadata(req),
    );
    sendSuccess(res, 200, { message: "AI operational response generated", data });
  };

  monitoringSummary: RequestHandler = async (req, res) => {
    const data = await aiService.monitoringSummary(
      req.user!.id,
      req.user!.role,
      requestMetadata(req),
    );
    sendSuccess(res, 200, { message: "AI monitoring summary generated", data });
  };

  prioritizeAlerts: RequestHandler = async (req, res) => {
    const data = await aiService.prioritizeAlerts(
      req.user!.id,
      req.user!.role,
      requestMetadata(req),
    );
    sendSuccess(res, 200, { message: "AI alert prioritization generated", data });
  };

  explainAlert: RequestHandler = async (req, res) => {
    const data = await aiService.explainAlert(
      req.params.alertId,
      req.user!.id,
      req.user!.role,
      requestMetadata(req),
    );
    sendSuccess(res, 200, { message: "AI alert explanation generated", data });
  };

  troubleshootDevice: RequestHandler = async (req, res) => {
    const data = await aiService.troubleshootDevice(
      req.params.deviceId,
      (req.body as AIDeviceGuidanceInput).question,
      req.user!.id,
      req.user!.role,
      requestMetadata(req),
    );
    sendSuccess(res, 200, { message: "AI device guidance generated", data });
  };
}

export const aiController = new AIController();
