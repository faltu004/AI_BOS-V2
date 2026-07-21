import { Router } from "express";
import { analyticsRoutes } from "./analytics.routes.js";
import { authRoutes } from "./auth.routes.js";
import { aiConfigRoutes } from "./ai-config.routes.js";
import { consultantRoutes } from "./consultant.routes.js";
import { copilotRoutes } from "./copilot.routes.js";
import { integrationRoutes } from "./integration.routes.js";
import { meetingAIRoutes } from "./meeting-ai.routes.js";
import { memoryRoutes } from "./memory.routes.js";
import { projectRoutes } from "./project.routes.js";
import { reportAIRoutes } from "./report-ai.routes.js";
import { uploadRoutes } from "./upload.routes.js";
import { userRoutes } from "./user.routes.js";
import { voiceRoutes } from "./voice.routes.js";
import { workflowRoutes } from "./workflow.routes.js";

export const routes = Router();

routes.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AI BOS API v1",
  });
});

routes.use("/analytics", analyticsRoutes);
routes.use("/auth", authRoutes);
routes.use("/ai-config", aiConfigRoutes);
routes.use("/consultant", consultantRoutes);
routes.use("/copilot", copilotRoutes);
routes.use("/integrations", integrationRoutes);
routes.use("/meetings/ai", meetingAIRoutes);
routes.use("/memory", memoryRoutes);
routes.use("/projects", projectRoutes);
routes.use("/reports", reportAIRoutes);
routes.use("/users", userRoutes);
routes.use("/uploads", uploadRoutes);
routes.use("/voice", voiceRoutes);
routes.use("/workflows", workflowRoutes);
