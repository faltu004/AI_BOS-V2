import { Router } from "express";
import { notificationPreferenceController } from "../controllers/notification-preference.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateNotificationPreferenceSchema } from "../validation/notification-preference.validation.js";

export const notificationPreferenceRoutes = Router();

notificationPreferenceRoutes.use(authenticate);

notificationPreferenceRoutes.get("/", ...route(notificationPreferenceController.getAll));
notificationPreferenceRoutes.patch(
  "/",
  ...route(validate({ body: updateNotificationPreferenceSchema }), notificationPreferenceController.update),
);
