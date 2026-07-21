import { Router } from "express";
import { projectController } from "../controllers/project.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
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
  authorize("Admin", "CEO", "Manager", "HR"),
  asyncHandler(projectController.stats),
);

projectRoutes.get(
  "/export/csv",
  validate({ query: listProjectsQuerySchema }),
  authorize("Admin", "CEO", "Manager"),
  asyncHandler(projectController.exportCsv),
);

projectRoutes.get(
  "/export/pdf",
  validate({ query: listProjectsQuerySchema }),
  authorize("Admin", "CEO", "Manager"),
  asyncHandler(projectController.exportPdf),
);

projectRoutes.get(
  "/",
  validate({ query: listProjectsQuerySchema }),
  asyncHandler(projectController.list),
);

projectRoutes.post(
  "/",
  authorize("Admin", "CEO", "Manager"),
  validate({ body: createProjectSchema }),
  asyncHandler(projectController.create),
);

projectRoutes.patch(
  "/bulk",
  authorize("Admin", "CEO", "Manager"),
  validate({ body: bulkUpdateProjectsSchema }),
  asyncHandler(projectController.bulkUpdate),
);

projectRoutes.delete(
  "/bulk",
  authorize("Admin", "CEO", "Manager"),
  validate({ body: bulkDeleteProjectsSchema }),
  asyncHandler(projectController.bulkDelete),
);

projectRoutes.get(
  "/:id",
  validate({ params: projectIdParamsSchema }),
  asyncHandler(projectController.getById),
);

projectRoutes.patch(
  "/:id",
  authorize("Admin", "CEO", "Manager"),
  validate({ params: projectIdParamsSchema, body: updateProjectSchema }),
  asyncHandler(projectController.update),
);

projectRoutes.delete(
  "/:id",
  authorize("Admin", "CEO"),
  validate({ params: projectIdParamsSchema }),
  asyncHandler(projectController.delete),
);

projectRoutes.patch(
  "/:id/archive",
  authorize("Admin", "CEO", "Manager"),
  validate({ params: projectIdParamsSchema }),
  asyncHandler(projectController.archive),
);

projectRoutes.post(
  "/:id/duplicate",
  authorize("Admin", "CEO", "Manager"),
  validate({ params: projectIdParamsSchema }),
  asyncHandler(projectController.duplicate),
);
