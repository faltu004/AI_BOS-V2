import { Router } from "express";
import { workflowController } from "../controllers/workflow.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createWorkflowSchema,
  duplicateWorkflowSchema,
  executeWorkflowSchema,
  listWorkflowsQuerySchema,
  updateWorkflowSchema,
  workflowIdParamsSchema,
} from "../validation/workflow.validation.js";

export const workflowRoutes = Router();

workflowRoutes.use(authenticate);

workflowRoutes.get(
  "/stats",
  authorize("Admin", "CEO", "Manager", "HR"),
  asyncHandler(workflowController.stats),
);

workflowRoutes.get(
  "/",
  validate({ query: listWorkflowsQuerySchema }),
  asyncHandler(workflowController.list),
);

workflowRoutes.post(
  "/",
  authorize("Admin", "CEO", "Manager"),
  validate({ body: createWorkflowSchema }),
  asyncHandler(workflowController.create),
);

workflowRoutes.get(
  "/:id",
  validate({ params: workflowIdParamsSchema }),
  asyncHandler(workflowController.getById),
);

workflowRoutes.patch(
  "/:id",
  authorize("Admin", "CEO", "Manager"),
  validate({ params: workflowIdParamsSchema, body: updateWorkflowSchema }),
  asyncHandler(workflowController.update),
);

workflowRoutes.delete(
  "/:id",
  authorize("Admin", "CEO"),
  validate({ params: workflowIdParamsSchema }),
  asyncHandler(workflowController.delete),
);

workflowRoutes.patch(
  "/:id/duplicate",
  authorize("Admin", "CEO", "Manager"),
  validate({ params: workflowIdParamsSchema, body: duplicateWorkflowSchema }),
  asyncHandler(workflowController.duplicate),
);

workflowRoutes.patch(
  "/:id/toggle",
  authorize("Admin", "CEO", "Manager"),
  validate({ params: workflowIdParamsSchema }),
  asyncHandler(workflowController.toggleStatus),
);

workflowRoutes.post(
  "/:id/execute",
  authorize("Admin", "CEO", "Manager"),
  validate({ params: workflowIdParamsSchema, body: executeWorkflowSchema }),
  asyncHandler(workflowController.execute),
);
