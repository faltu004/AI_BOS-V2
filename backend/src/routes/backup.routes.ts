import { Router } from "express";
import { backupController } from "../controllers/backup.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  backupIdParamsSchema,
  restoreBackupSchema,
  runBackupSchema,
  updateScheduleParamsSchema,
  updateScheduleSchema,
} from "../validation/backup.validation.js";

export const backupRoutes = Router();

backupRoutes.use(authenticate, requirePermission("backup.manage"));

backupRoutes.get("/history", ...route(backupController.history));
backupRoutes.post("/run", ...route(validate({ body: runBackupSchema }), backupController.run));
backupRoutes.post(
  "/:id/restore",
  ...route(validate({ params: backupIdParamsSchema, body: restoreBackupSchema }), backupController.restore),
);
backupRoutes.get("/:id/download", ...route(validate({ params: backupIdParamsSchema }), backupController.download));
backupRoutes.get("/schedule", ...route(backupController.getSchedule));
backupRoutes.patch(
  "/schedule/:type",
  ...route(validate({ params: updateScheduleParamsSchema, body: updateScheduleSchema }), backupController.updateSchedule),
);
