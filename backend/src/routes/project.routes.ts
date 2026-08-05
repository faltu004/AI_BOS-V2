import { Router } from "express";
import { projectController } from "../controllers/project.controller.js";
import { projectCommentController } from "../controllers/task-comment.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { requireProjectRole } from "../middleware/project-rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  bulkDeleteProjectsSchema,
  bulkUpdateProjectsSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  projectMemberParamsSchema,
  projectIdParamsSchema,
  upsertProjectMemberSchema,
  updateProjectSchema,
} from "../validation/project.validation.js";
import {
  commentIdParamsSchema,
  commentResourceParamsSchema,
  createCommentSchema,
  listCommentsQuerySchema,
  updateCommentSchema,
} from "../validation/task-comment.validation.js";

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

projectRoutes.get(
  "/:id/members",
  ...route(validate({ params: projectIdParamsSchema }), projectController.listMembers),
);

projectRoutes.put(
  "/:id/members",
  ...route(
    requirePermission("project.update"),
    requireProjectRole("Owner", "Manager"),
    validate({ params: projectIdParamsSchema, body: upsertProjectMemberSchema }),
    projectController.upsertMember,
  ),
);

projectRoutes.delete(
  "/:id/members/:userId",
  ...route(
    requirePermission("project.update"),
    requireProjectRole("Owner", "Manager"),
    validate({ params: projectMemberParamsSchema }),
    projectController.removeMember,
  ),
);

projectRoutes.get(
  "/:id/comments",
  ...route(
    validate({ params: commentResourceParamsSchema, query: listCommentsQuerySchema }),
    projectCommentController.list,
  ),
);

projectRoutes.post(
  "/:id/comments",
  ...route(
    requirePermission("project.comment"),
    validate({ params: commentResourceParamsSchema, body: createCommentSchema }),
    projectCommentController.create,
  ),
);

projectRoutes.patch(
  "/:id/comments/:commentId",
  ...route(
    requirePermission("project.comment"),
    validate({ params: commentIdParamsSchema, body: updateCommentSchema }),
    projectCommentController.update,
  ),
);

projectRoutes.delete(
  "/:id/comments/:commentId",
  ...route(
    requirePermission("project.comment"),
    validate({ params: commentIdParamsSchema }),
    projectCommentController.delete,
  ),
);
