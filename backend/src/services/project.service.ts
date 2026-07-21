import type { Types } from "mongoose";
import { projectRepository } from "../repositories/project.repository.js";
import { AppError } from "../utils/app-error.js";
import { toCsv } from "../utils/csv.js";
import { createSimplePdfBuffer } from "../utils/pdf.js";
import { generateProjectCode } from "../utils/project-code.js";
import type {
  BulkDeleteProjectsInput,
  BulkUpdateProjectsInput,
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from "../validation/project.validation.js";

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

async function createUniqueProjectCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const projectCode = generateProjectCode();
    const existingProject = await projectRepository.findByCode(projectCode);

    if (!existingProject) {
      return projectCode;
    }
  }

  throw new AppError("Unable to generate unique project code", 500);
}

export class ProjectService {
  async create(input: CreateProjectInput, userId?: string) {
    const projectCode = await createUniqueProjectCode();

    return projectRepository.create({
      ...input,
      projectCode,
      tags: normalizeTags(input.tags),
      isArchived: input.status === "Archived",
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListProjectsQuery) {
    return projectRepository.list(query);
  }

  async getById(id: string) {
    const project = await projectRepository.findById(id);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return project;
  }

  async update(id: string, input: UpdateProjectInput, userId?: string) {
    const updates = {
      ...input,
      ...(input.tags ? { tags: normalizeTags(input.tags) } : {}),
      ...(input.status ? { isArchived: input.status === "Archived" } : {}),
      updatedBy: userId,
    };

    const project = await projectRepository.update(id, updates);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return project;
  }

  async delete(id: string) {
    const project = await projectRepository.delete(id);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return { deleted: true };
  }

  async archive(id: string, userId?: string) {
    return this.update(id, { status: "Archived" }, userId);
  }

  async duplicate(id: string, userId?: string) {
    const project = await this.getById(id);
    const duplicateCode = await createUniqueProjectCode();

    return projectRepository.create({
      projectName: `${project.projectName} Copy`,
      projectCode: duplicateCode,
      description: project.description,
      category: project.category,
      priority: project.priority,
      status: "Planning",
      progress: 0,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      estimatedHours: project.estimatedHours,
      client: project.client,
      teamMembers: project.teamMembers,
      projectManager: project.projectManager,
      attachments: project.attachments,
      notes: project.notes,
      tags: project.tags,
      isArchived: false,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });
  }

  async bulkDelete(input: BulkDeleteProjectsInput) {
    const result = await projectRepository.bulkDelete(input.ids);
    return { deletedCount: result.deletedCount };
  }

  async bulkUpdate(input: BulkUpdateProjectsInput, userId?: string) {
    const result = await projectRepository.bulkUpdate(input.ids, {
      ...input.updates,
      updatedBy: userId,
    });

    return { modifiedCount: result.modifiedCount };
  }

  async stats() {
    return projectRepository.stats();
  }

  async exportCsv(query: ListProjectsQuery) {
    const projects = await projectRepository.listAll(query);
    return toCsv(
      projects.map((project) => ({
        projectCode: project.projectCode,
        projectName: project.projectName,
        status: project.status,
        priority: project.priority,
        category: project.category,
        progress: project.progress,
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
        client: project.client,
        projectManager: project.projectManager,
      })),
      [
        "projectCode",
        "projectName",
        "status",
        "priority",
        "category",
        "progress",
        "budget",
        "startDate",
        "endDate",
        "client",
        "projectManager",
      ],
    );
  }

  async exportPdf(query: ListProjectsQuery) {
    const projects = await projectRepository.listAll(query);
    const lines = projects.map(
      (project) =>
        `${project.projectCode} - ${project.projectName} - ${project.status} - ${project.progress}%`,
    );

    return createSimplePdfBuffer("AI BOS Project Export", lines);
  }
}

export const projectService = new ProjectService();
