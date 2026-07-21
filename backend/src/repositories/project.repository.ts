import type { FilterQuery, SortOrder, UpdateQuery } from "mongoose";
import { ProjectModel, type Project, type ProjectDocument } from "../models/project.model.js";
import type { ListProjectsQuery } from "../validation/project.validation.js";

export type ProjectCreateData = Omit<Project, "createdAt" | "updatedAt">;

function buildProjectFilter(query: ListProjectsQuery): FilterQuery<Project> {
  const filter: FilterQuery<Project> = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = query.category;
  if (typeof query.archived === "boolean") filter.isArchived = query.archived;

  return filter;
}

export class ProjectRepository {
  async create(data: ProjectCreateData) {
    return ProjectModel.create(data);
  }

  async findById(id: string) {
    return ProjectModel.findById(id);
  }

  async findByCode(projectCode: string) {
    return ProjectModel.findOne({ projectCode });
  }

  async list(query: ListProjectsQuery) {
    const filter = buildProjectFilter(query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      ProjectModel.find(filter).sort(sort).skip(skip).limit(query.limit),
      ProjectModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async listAll(query: ListProjectsQuery) {
    return ProjectModel.find(buildProjectFilter(query)).sort({
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    });
  }

  async update(id: string, updates: UpdateQuery<ProjectDocument>) {
    return ProjectModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id: string) {
    return ProjectModel.findByIdAndDelete(id);
  }

  async bulkDelete(ids: string[]) {
    return ProjectModel.deleteMany({ _id: { $in: ids } });
  }

  async bulkUpdate(ids: string[], updates: UpdateQuery<ProjectDocument>) {
    return ProjectModel.updateMany({ _id: { $in: ids } }, updates, {
      runValidators: true,
    });
  }

  async stats() {
    const now = new Date();

    const [total, active, completed, delayed, upcomingDeadlines] = await Promise.all([
      ProjectModel.countDocuments({ isArchived: false }),
      ProjectModel.countDocuments({ status: "Active", isArchived: false }),
      ProjectModel.countDocuments({ status: "Completed", isArchived: false }),
      ProjectModel.countDocuments({
        status: { $ne: "Completed" },
        endDate: { $lt: now },
        isArchived: false,
      }),
      ProjectModel.countDocuments({
        endDate: {
          $gte: now,
          $lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
        isArchived: false,
      }),
    ]);

    return { total, active, completed, delayed, upcomingDeadlines };
  }
}

export const projectRepository = new ProjectRepository();
