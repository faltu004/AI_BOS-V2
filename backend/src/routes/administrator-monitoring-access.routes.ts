import {
  Router,
} from "express";

import {
  administratorMonitoringAccessController,
} from "../controllers/administrator-monitoring-access.controller.js";
import {
  authenticate,
} from "../middleware/auth.middleware.js";
import {
  asyncHandler,
} from "../middleware/async-handler.js";
import {
  requireRole,
} from "../middleware/rbac.middleware.js";
import {
  validate,
} from "../middleware/validate.middleware.js";
import {
  administratorMonitoringAccessParamsSchema,
  updateAdministratorMonitoringAccessSchema,
} from "../validation/administrator-monitoring-access.validation.js";

export const administratorMonitoringAccessRoutes =
  Router();

administratorMonitoringAccessRoutes.use(
  authenticate,
);

administratorMonitoringAccessRoutes.get(
  "/me",
  requireRole(
    "Owner",
    "Administrator",
  ),
  asyncHandler(
    administratorMonitoringAccessController
      .getCurrent,
  ),
);

administratorMonitoringAccessRoutes.get(
  "/",
  requireRole(
    "Owner",
  ),
  asyncHandler(
    administratorMonitoringAccessController
      .list,
  ),
);

administratorMonitoringAccessRoutes.put(
  "/:administratorUserId",
  requireRole(
    "Owner",
  ),
  validate({
    params:
      administratorMonitoringAccessParamsSchema,
    body:
      updateAdministratorMonitoringAccessSchema,
  }),
  asyncHandler(
    administratorMonitoringAccessController
      .update,
  ),
);
