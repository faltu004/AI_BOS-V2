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
    return ProjectModel.findById(id).lean();
  }

  async findByCode(projectCode: string) {
    return ProjectModel.findOne({ projectCode }).select("_id").lean();
  }

  async list(query: ListProjectsQuery) {
    const filter = buildProjectFilter(query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      ProjectModel.find(filter).sort(sort).skip(skip).limit(query.limit).lean(),
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
    }).lean();
  }

  async update(id: string, updates: UpdateQuery<ProjectDocument>) {
    return ProjectModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();
  }

  async delete(id: string) {
    return ProjectModel.findByIdAndDelete(id).select("_id").lean();
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
    const upcomingThreshold = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [stats] = await ProjectModel.aggregate<{
      total: number;
      active: number;
      completed: number;
      delayed: number;
      upcomingDeadlines: number;
    }>([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          delayed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "Completed"] },
                    { $lt: ["$endDate", now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          upcomingDeadlines: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$endDate", now] },
                    { $lte: ["$endDate", upcomingThreshold] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0, total: 1, active: 1, completed: 1, delayed: 1, upcomingDeadlines: 1 } },
    ]);

    return stats ?? { total: 0, active: 0, completed: 0, delayed: 0, upcomingDeadlines: 0 };
  }
}

export const projectRepository = new ProjectRepository();
