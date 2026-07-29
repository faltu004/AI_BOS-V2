import { Router } from "express";
import { projectController } from "../controllers/project.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  bulkDeleteProjectsSchema,
  bulkUpdateProjectsSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from "../validation/project.validation.js";

export const projectRoutes = Router();

projectRoutes.use(authenticate);

projectRoutes.get(
  "/stats",
  ...route(requirePermission("project.view_stats"), projectController.stats),
);

projectRoutes.get(
  "/export/csv",
  ...route(validate({ query: listProjectsQuerySchema }), requirePermission("project.export"), projectController.exportCsv),
);

projectRoutes.get(
  "/export/pdf",
  ...route(validate({ query: listProjectsQuerySchema }), requirePermission("project.export"), projectController.exportPdf),
);

projectRoutes.get(
  "/",
  ...route(validate({ query: listProjectsQuerySchema }), projectController.list),
);

projectRoutes.post(
  "/",
  ...route(requirePermission("project.create"), validate({ body: createProjectSchema }), projectController.create),
);

projectRoutes.patch(
  "/bulk",
  ...route(requirePermission("project.bulk_update"), validate({ body: bulkUpdateProjectsSchema }), projectController.bulkUpdate),
);

projectRoutes.delete(
  "/bulk",
  ...route(requirePermission("project.bulk_delete"), validate({ body: bulkDeleteProjectsSchema }), projectController.bulkDelete),
);

projectRoutes.get(
  "/:id",
  ...route(validate({ params: projectIdParamsSchema }), projectController.getById),
);

projectRoutes.patch(
  "/:id",
  ...route(requirePermission("project.update"), validate({ params: projectIdParamsSchema, body: updateProjectSchema }), projectController.update),
);

projectRoutes.delete(
  "/:id",
  ...route(requirePermission("project.delete"), validate({ params: projectIdParamsSchema }), projectController.delete),
);

projectRoutes.patch(
  "/:id/archive",
  ...route(requirePermission("project.archive"), validate({ params: projectIdParamsSchema }), projectController.archive),
);

projectRoutes.post(
  "/:id/duplicate",
  ...route(requirePermission("project.duplicate"), validate({ params: projectIdParamsSchema }), projectController.duplicate),
);
