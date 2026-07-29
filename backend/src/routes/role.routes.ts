import { Router } from "express";
import { roleController } from "../controllers/role.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createRoleSchema,
  listRolesQuerySchema,
  roleIdParamsSchema,
  updateRoleSchema,
} from "../validation/role.validation.js";

export const roleRoutes = Router();

roleRoutes.use(authenticate);

roleRoutes.get(
  "/",
  ...route(requirePermission("role.view"), validate({ query: listRolesQuerySchema }), roleController.list),
);

roleRoutes.post(
  "/",
  ...route(requirePermission("role.create"), validate({ body: createRoleSchema }), roleController.create),
);

roleRoutes.get(
  "/:id",
  ...route(requirePermission("role.view"), validate({ params: roleIdParamsSchema }), roleController.getById),
);

roleRoutes.patch(
  "/:id",
  ...route(
    requirePermission("role.update"),
    validate({ params: roleIdParamsSchema, body: updateRoleSchema }),
    roleController.update,
  ),
);

roleRoutes.delete(
  "/:id",
  ...route(requirePermission("role.delete"), validate({ params: roleIdParamsSchema }), roleController.delete),
);
