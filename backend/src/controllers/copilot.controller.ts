import type { RequestHandler } from "express";
import { copilotService } from "../services/copilot.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { validate } from "../middleware/validate.middleware.js";
import type { CopilotContextInput, CopilotMessageInput, CopilotSuggestionsInput } from "../validation/copilot.validation.js";

export class CopilotController {
  message: RequestHandler = async (req, res) => {
    const result = await copilotService.message(req.body, req.user?.id);
    sendSuccess(res, 200, { message: "Copilot response generated", data: result });
  };

  stream: RequestHandler = async (req, res) => {
    const response = await copilotService.stream(req.body, req.user?.id);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.status(200);

    for await (const chunk of response) {
      res.write(`data: ${chunk}\n\n`);
    }
    res.write("event: done\ndata: [DONE]\n\n");
    res.end();
  };

  context: RequestHandler = async (req, res) => {
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const module = typeof req.query.module === "string" ? req.query.module : undefined;
    const context = await copilotService.getContext(page || module ? { page, module } : undefined, req.user?.id);
    sendSuccess(res, 200, { message: "Copilot context fetched", data: context });
  };

  suggestions: RequestHandler = async (req, res) => {
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const suggestions = await copilotService.getSuggestions(page ? { page } : undefined, req.user?.id);
    sendSuccess(res, 200, { message: "Suggestions fetched", data: suggestions });
  };
}

export const copilotController = new CopilotController();
