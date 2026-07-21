import { Router } from "express";
import type { RequestHandler } from "express";
import { aiConfigController } from "../controllers/ai-config.controller.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { AppError } from "../utils/app-error.js";
import { updateAIConfigSchema } from "../validation/ai-config.validation.js";

export const aiConfigRoutes = Router();

const requireServiceKey: RequestHandler = (req, _res, next) => {
  const expectedKey = env.SERVICE_API_KEY;
  if (!expectedKey || req.header("x-ai-service-key") !== expectedKey) {
    throw new AppError("Invalid AI service key", 401);
  }
  next();
};

aiConfigRoutes.get("/runtime", requireServiceKey, asyncHandler(aiConfigController.runtime));

aiConfigRoutes.use(authenticate, authorize("Admin"));

aiConfigRoutes.get("/", asyncHandler(aiConfigController.get));
aiConfigRoutes.patch(
  "/",
  validate({ body: updateAIConfigSchema }),
  asyncHandler(aiConfigController.update),
);
