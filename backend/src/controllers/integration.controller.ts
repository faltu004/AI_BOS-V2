import type { RequestHandler } from "express";
import { integrationService } from "../services/integration.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class IntegrationController {
  connect: RequestHandler = async (req, res) => {
    const { integrationId, apiKey } = req.body;
    const result = await integrationService.connect(integrationId, apiKey);
    sendSuccess(res, 200, { message: "Integration connected", data: result });
  };

  disconnect: RequestHandler = async (req, res) => {
    const { integrationId } = req.body;
    await integrationService.disconnect(integrationId);
    sendSuccess(res, 200, { message: "Integration disconnected", data: null });
  };

  sync: RequestHandler = async (req, res) => {
    const { integrationId } = req.body;
    await integrationService.sync(integrationId);
    sendSuccess(res, 200, { message: "Integration synced", data: null });
  };

  healthCheck: RequestHandler = async (req, res) => {
    const { integrationId } = req.body;
    const result = await integrationService.healthCheck(integrationId);
    sendSuccess(res, 200, { message: "Health check completed", data: result });
  };

  getIntegrations: RequestHandler = async (req, res) => {
    const result = await integrationService.getIntegrations();
    sendSuccess(res, 200, { message: "Integrations retrieved", data: result });
  };

  getLogs: RequestHandler = async (req, res) => {
    const { integrationId } = req.params;
    const result = await integrationService.getLogs(integrationId);
    sendSuccess(res, 200, { message: "Logs retrieved", data: result });
  };
}

export const integrationController = new IntegrationController();