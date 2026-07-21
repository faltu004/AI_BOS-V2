import { Router } from "express";
import { voiceController } from "../controllers/voice.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  voiceCommandSchema,
  createVoiceSessionSchema,
  voiceHistoryQuerySchema,
  ttsRequestSchema,
} from "../validation/voice.validation.js";

export const voiceRoutes = Router();

voiceRoutes.use(authenticate);

voiceRoutes.post(
  "/session",
  validate({ body: createVoiceSessionSchema }),
  asyncHandler(voiceController.createSession),
);

voiceRoutes.post(
  "/commands",
  validate({ body: voiceCommandSchema }),
  asyncHandler(voiceController.processCommand),
);

voiceRoutes.get(
  "/history",
  validate({ query: voiceHistoryQuerySchema }),
  asyncHandler(voiceController.getHistory),
);

voiceRoutes.get(
  "/permissions",
  asyncHandler(voiceController.getPermissions),
);

voiceRoutes.post(
  "/stt",
  asyncHandler(voiceController.stt),
);

voiceRoutes.post(
  "/tts",
  validate({ body: ttsRequestSchema }),
  asyncHandler(voiceController.tts),
);