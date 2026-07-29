import type { RequestHandler } from "express";
import { aiService } from "../services/ai.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class AIController {
  context: RequestHandler = async (req, res) => {
    const data = await aiService.getContext(req.user!.id, req.user!.role);
    sendSuccess(res, 200, { message: "AI context fetched", data });
  };

  chat: RequestHandler = async (req, res) => {
    const data = await aiService.chat(req.body, req.user!.id, req.user!.role);
    sendSuccess(res, 200, { message: "AI response generated", data });
  };
}

export const aiController = new AIController();
