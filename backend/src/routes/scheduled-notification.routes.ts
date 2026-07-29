import { Router } from "express";
import { scheduledNotificationController } from "../controllers/scheduled-notification.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createScheduledNotificationSchema,
  scheduledNotificationIdParamsSchema,
} from "../validation/scheduled-notification.validation.js";

export const scheduledNotificationRoutes = Router();

scheduledNotificationRoutes.use(authenticate);

scheduledNotificationRoutes.get("/", ...route(scheduledNotificationController.list));
scheduledNotificationRoutes.post(
  "/",
  ...route(validate({ body: createScheduledNotificationSchema }), scheduledNotificationController.create),
);
scheduledNotificationRoutes.patch(
  "/:id/cancel",
  ...route(validate({ params: scheduledNotificationIdParamsSchema }), scheduledNotificationController.cancel),
);
