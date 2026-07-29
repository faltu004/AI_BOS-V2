import { Router } from "express";
import { roleHistoryController } from "../controllers/role-history.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { listRoleHistoryQuerySchema, roleHistoryParamsSchema } from "../validation/role-history.validation.js";

export const roleHistoryRoutes = Router();

roleHistoryRoutes.use(authenticate);

roleHistoryRoutes.get(
  "/:roleId",
  ...route(
    requirePermission("role_history.view"),
    validate({ params: roleHistoryParamsSchema, query: listRoleHistoryQuerySchema }),
    roleHistoryController.listByRole,
  ),
);
