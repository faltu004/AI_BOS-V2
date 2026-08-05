import { Router } from "express";
import { workflowController } from "../controllers/workflow.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  approveExecutionSchema,
  createWorkflowSchema,
  duplicateWorkflowSchema,
  executeWorkflowSchema,
  executionIdParamsSchema,
  listExecutionsQuerySchema,
  listWorkflowsQuerySchema,
  updateWorkflowSchema,
  workflowIdParamsSchema,
} from "../validation/workflow.validation.js";

export const workflowRoutes = Router();

workflowRoutes.use(authenticate);

workflowRoutes.get(
  "/stats",
  ...route(requirePermission("workflow.view_stats"), workflowController.stats),
);

workflowRoutes.get(
  "/",
  ...route(validate({ query: listWorkflowsQuerySchema }), workflowController.list),
);

workflowRoutes.post(
  "/",
  ...route(requirePermission("workflow.create"), validate({ body: createWorkflowSchema }), workflowController.create),
);

workflowRoutes.get(
  "/:id",
  ...route(validate({ params: workflowIdParamsSchema }), workflowController.getById),
);

workflowRoutes.patch(
  "/:id",
  ...route(requirePermission("workflow.update"), validate({ params: workflowIdParamsSchema, body: updateWorkflowSchema }), workflowController.update),
);

workflowRoutes.delete(
  "/:id",
  ...route(requirePermission("workflow.delete"), validate({ params: workflowIdParamsSchema }), workflowController.delete),
);

workflowRoutes.patch(
  "/:id/duplicate",
  ...route(requirePermission("workflow.duplicate"), validate({ params: workflowIdParamsSchema, body: duplicateWorkflowSchema }), workflowController.duplicate),
);

workflowRoutes.patch(
  "/:id/toggle",
  ...route(requirePermission("workflow.toggle_status"), validate({ params: workflowIdParamsSchema }), workflowController.toggleStatus),
);

workflowRoutes.post(
  "/:id/execute",
  ...route(requirePermission("workflow.execute"), validate({ params: workflowIdParamsSchema, body: executeWorkflowSchema }), workflowController.execute),
);

workflowRoutes.get(
  "/:id/executions",
  ...route(validate({ params: workflowIdParamsSchema, query: listExecutionsQuerySchema }), workflowController.listExecutions),
);

workflowRoutes.post(
  "/executions/:executionId/approve",
  ...route(
    requirePermission("workflow.approve_step"),
    validate({ params: executionIdParamsSchema, body: approveExecutionSchema }),
    workflowController.approveStep,
  ),
);
