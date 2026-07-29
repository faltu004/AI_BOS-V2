import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { listNotificationsQuerySchema, notificationIdParamsSchema } from "../validation/notification.validation.js";

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

notificationRoutes.get("/", ...route(validate({ query: listNotificationsQuerySchema }), notificationController.list));
notificationRoutes.get("/unread-count", ...route(notificationController.unreadCount));
notificationRoutes.patch(
  "/read-all",
  ...route(notificationController.markAllRead),
);
notificationRoutes.patch(
  "/:id/read",
  ...route(validate({ params: notificationIdParamsSchema }), notificationController.markRead),
);
