import { Router } from "express";
import { roleTemplateController } from "../controllers/role-template.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createRoleTemplateSchema,
  listRoleTemplatesQuerySchema,
  roleTemplateIdParamsSchema,
  updateRoleTemplateSchema,
} from "../validation/role-template.validation.js";

export const roleTemplateRoutes = Router();

roleTemplateRoutes.use(authenticate, requirePermission("role_template.manage"));

roleTemplateRoutes.get(
  "/",
  ...route(validate({ query: listRoleTemplatesQuerySchema }), roleTemplateController.list),
);

roleTemplateRoutes.post(
  "/",
  ...route(validate({ body: createRoleTemplateSchema }), roleTemplateController.create),
);

roleTemplateRoutes.get(
  "/:id",
  ...route(validate({ params: roleTemplateIdParamsSchema }), roleTemplateController.getById),
);

roleTemplateRoutes.patch(
  "/:id",
  ...route(
    validate({ params: roleTemplateIdParamsSchema, body: updateRoleTemplateSchema }),
    roleTemplateController.update,
  ),
);

roleTemplateRoutes.delete(
  "/:id",
  ...route(validate({ params: roleTemplateIdParamsSchema }), roleTemplateController.delete),
);
