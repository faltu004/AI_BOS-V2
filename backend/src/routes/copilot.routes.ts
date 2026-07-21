import { Router } from "express";
import { copilotController } from "../controllers/copilot.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { copilotMessageSchema, copilotContextSchema } from "../validation/copilot.validation.js";

export const copilotRoutes = Router();

copilotRoutes.use(authenticate);

copilotRoutes.post(
  "/message",
  validate({ body: copilotMessageSchema }),
  asyncHandler(copilotController.message),
);

copilotRoutes.post(
  "/message/stream",
  validate({ body: copilotMessageSchema }),
  asyncHandler(copilotController.stream),
);

copilotRoutes.get(
  "/context",
  validate({ query: copilotContextSchema }),
  asyncHandler(copilotController.context),
);

copilotRoutes.get(
  "/suggestions",
  asyncHandler(copilotController.suggestions),
);
