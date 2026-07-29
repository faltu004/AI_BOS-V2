import type { Request, RequestHandler } from "express";
import { appConfig } from "../config/app.js";
import { integrationService } from "../services/integration.service.js";
import { sendSuccess } from "../utils/api-response.js";
import type { UpdateIntegrationSettingsInput, UpdateProviderConfigInput } from "../validation/integration.validation.js";

function resolveReturnOrigin(req: Request) {
  const fromQuery = req.query.returnOrigin as string | undefined;
  if (fromQuery) return fromQuery;
  const origin = req.headers.origin;
  if (origin) return origin;
  return appConfig.clientOrigins[0] ?? "http://127.0.0.1:8081";
}

export class IntegrationController {
  list: RequestHandler = async (_req, res) => {
    const result = await integrationService.list();
    sendSuccess(res, 200, { message: "Integrations fetched successfully", data: result });
  };

  getConnectUrl: RequestHandler = async (req, res) => {
    const key = req.params.key as never;
    const result = await integrationService.getConnectUrl(key, req.user!.id, resolveReturnOrigin(req));
    sendSuccess(res, 200, { message: "Authorization URL generated", data: result });
  };

  oauthCallback: RequestHandler = async (req, res) => {
    const { code, state } = req.query as { code: string; state: string };
    const result = await integrationService.handleCallback(code, state);
    const status = result.success ? "connected" : "error";
    res.redirect(`${result.returnOrigin}/integrations?${status}=${result.integrationKey}`);
  };

  disconnect: RequestHandler = async (req, res) => {
    const key = req.params.key as never;
    const result = await integrationService.disconnect(key);
    sendSuccess(res, 200, { message: "Integration disconnected successfully", data: result });
  };

  testConnection: RequestHandler = async (req, res) => {
    const key = req.params.key as never;
    const result = await integrationService.testConnection(key);
    sendSuccess(res, 200, { message: "Connection test completed", data: result });
  };

  sync: RequestHandler = async (req, res) => {
    const key = req.params.key as never;
    const result = await integrationService.sync(key);
    sendSuccess(res, 200, { message: "Sync completed", data: result });
  };

  updateSettings: RequestHandler = async (req, res) => {
    const key = req.params.key as never;
    const input = req.body as UpdateIntegrationSettingsInput;
    const result = await integrationService.updateSettings(key, input);
    sendSuccess(res, 200, { message: "Integration settings updated", data: result });
  };

  getLogs: RequestHandler = async (req, res) => {
    const key = req.params.key as never;
    const result = await integrationService.getLogs(key);
    sendSuccess(res, 200, { message: "Logs fetched successfully", data: result });
  };

  listProviderConfigs: RequestHandler = async (_req, res) => {
    const result = await integrationService.listProviderConfigs();
    sendSuccess(res, 200, { message: "Provider configuration fetched successfully", data: result });
  };

  updateProviderConfig: RequestHandler = async (req, res) => {
    const family = req.params.family as never;
    const input = req.body as UpdateProviderConfigInput;
    const result = await integrationService.updateProviderConfig(family, input, req.user?.id);
    sendSuccess(res, 200, { message: "Provider configuration updated successfully", data: result });
  };
}

export const integrationController = new IntegrationController();
