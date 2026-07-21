import type { RequestHandler } from "express";
import { workflowService } from "../services/workflow.service.js";
import { sendSuccess } from "../utils/api-response.js";
import type { ExecuteWorkflowInput, ListWorkflowsQuery } from "../validation/workflow.validation.js";

export class WorkflowController {
  stats: RequestHandler = async (_req, res) => {
    const stats = await workflowService.stats();
    sendSuccess(res, 200, { message: "Workflow stats fetched successfully", data: stats });
  };

  list: RequestHandler = async (req, res) => {
    const result = await workflowService.list(req.query as unknown as ListWorkflowsQuery);
    sendSuccess(res, 200, { message: "Workflows fetched successfully", data: result });
  };

  create: RequestHandler = async (req, res) => {
    const workflow = await workflowService.create(req.body, req.user?.id);
    sendSuccess(res, 201, { message: "Workflow created successfully", data: workflow });
  };

  getById: RequestHandler = async (req, res) => {
    const workflow = await workflowService.getById(req.params.id);
    sendSuccess(res, 200, { message: "Workflow fetched successfully", data: workflow });
  };

  update: RequestHandler = async (req, res) => {
    const workflow = await workflowService.update(req.params.id, req.body, req.user?.id);
    sendSuccess(res, 200, { message: "Workflow updated successfully", data: workflow });
  };

  delete: RequestHandler = async (req, res) => {
    const result = await workflowService.delete(req.params.id);
    sendSuccess(res, 200, { message: "Workflow deleted successfully", data: result });
  };

  duplicate: RequestHandler = async (req, res) => {
    const workflow = await workflowService.duplicate(req.params.id, req.body, req.user?.id);
    sendSuccess(res, 201, { message: "Workflow duplicated successfully", data: workflow });
  };

  toggleStatus: RequestHandler = async (req, res) => {
    const workflow = await workflowService.toggleStatus(req.params.id, req.user?.id);
    sendSuccess(res, 200, { message: "Workflow status updated successfully", data: workflow });
  };

  execute: RequestHandler = async (req, res) => {
    const result = await workflowService.execute(req.params.id, req.body as ExecuteWorkflowInput, req.user?.id);
    sendSuccess(res, 200, { message: "Workflow executed successfully", data: result });
  };
}

export const workflowController = new WorkflowController();
