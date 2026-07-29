import { Router } from "express";
import { permissionGroupController } from "../controllers/permission-group.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createPermissionGroupSchema,
  listPermissionGroupsQuerySchema,
  permissionGroupIdParamsSchema,
  updatePermissionGroupSchema,
} from "../validation/permission-group.validation.js";

export const permissionGroupRoutes = Router();

permissionGroupRoutes.use(authenticate, requirePermission("permission_group.manage"));

permissionGroupRoutes.get(
  "/",
  ...route(validate({ query: listPermissionGroupsQuerySchema }), permissionGroupController.list),
);

permissionGroupRoutes.post(
  "/",
  ...route(validate({ body: createPermissionGroupSchema }), permissionGroupController.create),
);

permissionGroupRoutes.get(
  "/:id",
  ...route(validate({ params: permissionGroupIdParamsSchema }), permissionGroupController.getById),
);

permissionGroupRoutes.patch(
  "/:id",
  ...route(
    validate({ params: permissionGroupIdParamsSchema, body: updatePermissionGroupSchema }),
    permissionGroupController.update,
  ),
);

permissionGroupRoutes.delete(
  "/:id",
  ...route(validate({ params: permissionGroupIdParamsSchema }), permissionGroupController.delete),
);
