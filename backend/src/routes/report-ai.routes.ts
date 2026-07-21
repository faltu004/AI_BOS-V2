import { Router } from "express";
import { reportAIController } from "../controllers/report-ai.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const reportAIRoutes = Router();

reportAIRoutes.use(authenticate);

reportAIRoutes.post("/generate", asyncHandler(reportAIController.generateReport));

reportAIRoutes.post("/export", asyncHandler(reportAIController.exportReport));

reportAIRoutes.post("/schedule", asyncHandler(reportAIController.scheduleReport));

reportAIRoutes.get("/scheduled", asyncHandler(reportAIController.listScheduledReports));

reportAIRoutes.delete("/scheduled/:reportId", asyncHandler(reportAIController.deleteScheduledReport));