import { Router } from "express";
import { integrationController } from "../controllers/integration.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const integrationRoutes = Router();

integrationRoutes.use(authenticate);

integrationRoutes.post("/connect", asyncHandler(integrationController.connect));

integrationRoutes.post("/disconnect", asyncHandler(integrationController.disconnect));

integrationRoutes.post("/sync", asyncHandler(integrationController.sync));

integrationRoutes.post("/health", asyncHandler(integrationController.healthCheck));

integrationRoutes.get("/", asyncHandler(integrationController.getIntegrations));

integrationRoutes.get("/logs/:integrationId", asyncHandler(integrationController.getLogs));