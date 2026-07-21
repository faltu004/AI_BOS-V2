import { Router } from "express";
import { meetingAIController } from "../controllers/meeting-ai.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const meetingAIRoutes = Router();

meetingAIRoutes.use(authenticate);

meetingAIRoutes.post("/:meetingId/transcribe", asyncHandler(meetingAIController.transcribe));

meetingAIRoutes.post("/:meetingId/summarize", asyncHandler(meetingAIController.summarize));

meetingAIRoutes.post("/:meetingId/extract-actions", asyncHandler(meetingAIController.extractActions));

meetingAIRoutes.post("/:meetingId/extract-decisions", asyncHandler(meetingAIController.extractDecisions));

meetingAIRoutes.post("/:meetingId/generate-report", asyncHandler(meetingAIController.generateReport));

meetingAIRoutes.get("/:meetingId", asyncHandler(meetingAIController.getAIData));