import { workflowService } from "../services/workflow.service.js";
import { jsonController } from "../utils/controller.js";
import type { ExecuteWorkflowInput, ListWorkflowsQuery } from "../validation/workflow.validation.js";
import { AppError } from "../utils/app-error.js";

export class WorkflowController {
  stats = jsonController(200, "Workflow stats fetched successfully", () => workflowService.stats());

  list = jsonController(200, "Workflows fetched successfully", ({ req }) =>
    workflowService.list(req.query as unknown as ListWorkflowsQuery),
  );

  create = jsonController(201, "Workflow created successfully", ({ req }) =>
    workflowService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Workflow fetched successfully", ({ req }) =>
    workflowService.getById(req.params.id),
  );

  update = jsonController(200, "Workflow updated successfully", ({ req }) =>
    workflowService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Workflow deleted successfully", ({ req }) =>
    workflowService.delete(req.params.id),
  );

  duplicate = jsonController(201, "Workflow duplicated successfully", ({ req }) =>
    workflowService.duplicate(req.params.id, req.body, req.user?.id),
  );

  toggleStatus = jsonController(200, "Workflow status updated successfully", ({ req }) =>
    workflowService.toggleStatus(req.params.id, req.user?.id),
  );

  execute = jsonController(200, "Workflow executed successfully", ({ req }) =>
    workflowService.execute(req.params.id, req.body as ExecuteWorkflowInput, req.user?.id),
  );

  listExecutions = jsonController(200, "Workflow executions fetched successfully", ({ req }) =>
    workflowService.listExecutions(req.params.id, req.query.limit ? Number(req.query.limit) : undefined),
  );

  approveStep = jsonController(200, "Workflow step decision recorded", ({ req }) => {
    if (!req.user) throw new AppError("Authentication required", 401);
    return workflowService.approveStep(req.params.executionId, req.user.role, req.body.approved);
  });
}

export const workflowController = new WorkflowController();
