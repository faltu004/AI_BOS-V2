import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { analyticsQuerySchema, analyticsExportSchema } from "../validation/analytics.validation.js";

export const analyticsRoutes = Router();

analyticsRoutes.use(authenticate);

analyticsRoutes.get("/", validate({ query: analyticsQuerySchema }), asyncHandler(analyticsController.getSection));

analyticsRoutes.post("/export", validate({ body: analyticsExportSchema }), asyncHandler(analyticsController.exportAnalytics));