import { Router } from "express";
import { departmentController } from "../controllers/department.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createDepartmentSchema,
  departmentIdParamsSchema,
  departmentMembersParamsSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema,
} from "../validation/department.validation.js";

export const departmentRoutes = Router();

departmentRoutes.use(authenticate);

departmentRoutes.get(
  "/",
  ...route(validate({ query: listDepartmentsQuerySchema }), departmentController.list),
);

departmentRoutes.post(
  "/",
  ...route(
    requirePermission("department.create"),
    validate({ body: createDepartmentSchema }),
    departmentController.create,
  ),
);

departmentRoutes.get(
  "/:id/members",
  ...route(validate({ params: departmentMembersParamsSchema }), departmentController.members),
);

departmentRoutes.get(
  "/:id",
  ...route(validate({ params: departmentIdParamsSchema }), departmentController.getById),
);

departmentRoutes.patch(
  "/:id",
  ...route(
    requirePermission("department.update"),
    validate({ params: departmentIdParamsSchema, body: updateDepartmentSchema }),
    departmentController.update,
  ),
);

departmentRoutes.delete(
  "/:id",
  ...route(
    requirePermission("department.delete"),
    validate({ params: departmentIdParamsSchema }),
    departmentController.delete,
  ),
);
