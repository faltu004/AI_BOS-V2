import { projectService } from "../services/project.service.js";
import { fileController, jsonController } from "../utils/controller.js";
import type { ListProjectsQuery } from "../validation/project.validation.js";

export class ProjectController {
  stats = jsonController(200, "Project stats fetched successfully", () => projectService.stats());

  list = jsonController(200, "Projects fetched successfully", ({ req }) =>
    projectService.list(req.query as unknown as ListProjectsQuery),
  );

  create = jsonController(201, "Project created successfully", ({ req }) =>
    projectService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Project fetched successfully", ({ req }) =>
    projectService.getById(req.params.id),
  );

  update = jsonController(200, "Project updated successfully", ({ req }) =>
    projectService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Project deleted successfully", ({ req }) =>
    projectService.delete(req.params.id),
  );

  archive = jsonController(200, "Project archived successfully", ({ req }) =>
    projectService.archive(req.params.id, req.user?.id),
  );

  duplicate = jsonController(201, "Project duplicated successfully", ({ req }) =>
    projectService.duplicate(req.params.id, req.user?.id),
  );

  bulkDelete = jsonController(200, "Projects deleted successfully", ({ req }) =>
    projectService.bulkDelete(req.body),
  );

  bulkUpdate = jsonController(200, "Projects updated successfully", ({ req }) =>
    projectService.bulkUpdate(req.body, req.user?.id),
  );

  exportCsv = fileController("text/csv", "attachment; filename=projects.csv", ({ req }) =>
    projectService.exportCsv(req.query as unknown as ListProjectsQuery),
  );

  exportPdf = fileController("application/pdf", "attachment; filename=projects.pdf", ({ req }) =>
    projectService.exportPdf(req.query as unknown as ListProjectsQuery),
  );
}

export const projectController = new ProjectController();
