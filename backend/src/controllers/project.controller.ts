import type { RequestHandler } from "express";
import { projectService } from "../services/project.service.js";
import { sendSuccess } from "../utils/api-response.js";
import type { ListProjectsQuery } from "../validation/project.validation.js";

export class ProjectController {
  stats: RequestHandler = async (_req, res) => {
    const stats = await projectService.stats();
    sendSuccess(res, 200, { message: "Project stats fetched successfully", data: stats });
  };

  list: RequestHandler = async (req, res) => {
    const result = await projectService.list(req.query as unknown as ListProjectsQuery);
    sendSuccess(res, 200, { message: "Projects fetched successfully", data: result });
  };

  create: RequestHandler = async (req, res) => {
    const project = await projectService.create(req.body, req.user?.id);
    sendSuccess(res, 201, { message: "Project created successfully", data: project });
  };

  getById: RequestHandler = async (req, res) => {
    const project = await projectService.getById(req.params.id);
    sendSuccess(res, 200, { message: "Project fetched successfully", data: project });
  };

  update: RequestHandler = async (req, res) => {
    const project = await projectService.update(req.params.id, req.body, req.user?.id);
    sendSuccess(res, 200, { message: "Project updated successfully", data: project });
  };

  delete: RequestHandler = async (req, res) => {
    const result = await projectService.delete(req.params.id);
    sendSuccess(res, 200, { message: "Project deleted successfully", data: result });
  };

  archive: RequestHandler = async (req, res) => {
    const project = await projectService.archive(req.params.id, req.user?.id);
    sendSuccess(res, 200, { message: "Project archived successfully", data: project });
  };

  duplicate: RequestHandler = async (req, res) => {
    const project = await projectService.duplicate(req.params.id, req.user?.id);
    sendSuccess(res, 201, { message: "Project duplicated successfully", data: project });
  };

  bulkDelete: RequestHandler = async (req, res) => {
    const result = await projectService.bulkDelete(req.body);
    sendSuccess(res, 200, { message: "Projects deleted successfully", data: result });
  };

  bulkUpdate: RequestHandler = async (req, res) => {
    const result = await projectService.bulkUpdate(req.body, req.user?.id);
    sendSuccess(res, 200, { message: "Projects updated successfully", data: result });
  };

  exportCsv: RequestHandler = async (req, res) => {
    const csv = await projectService.exportCsv(req.query as unknown as ListProjectsQuery);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=projects.csv");
    res.status(200).send(csv);
  };

  exportPdf: RequestHandler = async (req, res) => {
    const pdf = await projectService.exportPdf(req.query as unknown as ListProjectsQuery);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=projects.pdf");
    res.status(200).send(pdf);
  };
}

export const projectController = new ProjectController();
