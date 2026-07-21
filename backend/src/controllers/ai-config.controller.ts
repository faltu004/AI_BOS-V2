import type { RequestHandler } from "express";
import { aiConfigService } from "../services/ai-config.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class AIConfigController {
  get: RequestHandler = async (_req, res) => {
    const config = await aiConfigService.get();
    sendSuccess(res, 200, { message: "AI configuration fetched successfully", data: config });
  };

  update: RequestHandler = async (req, res) => {
    const config = await aiConfigService.update(req.body, req.user?.id);
    sendSuccess(res, 200, { message: "AI configuration updated securely", data: config });
  };

  runtime: RequestHandler = async (_req, res) => {
    const config = await aiConfigService.getRuntimeConfig();
    sendSuccess(res, 200, { message: "AI runtime configuration fetched securely", data: config });
  };
}

export const aiConfigController = new AIConfigController();
