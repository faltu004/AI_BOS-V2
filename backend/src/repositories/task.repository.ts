import type { FilterQuery, SortOrder, UpdateQuery } from "mongoose";
import { TaskModel, type Task, type TaskDocument } from "../models/task.model.js";
import type { ListTasksQuery } from "../validation/task.validation.js";

export type TaskCreateData = Omit<Task, "createdAt" | "updatedAt">;

const assigneePopulate = { path: "assigneeId", select: "fullName email" };
const reporterPopulate = { path: "reporterId", select: "fullName email" };

function buildTaskFilter(query: ListTasksQuery): FilterQuery<Task> {
  const filter: FilterQuery<Task> = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.issueType) filter.issueType = query.issueType;
  if (query.projectId) filter.projectId = query.projectId;
  if (query.epicId) filter.epicId = query.epicId;
  if (query.sprintId) filter.sprintId = query.sprintId;
  if (query.assigneeId) filter.assigneeId = query.assigneeId;
  if (typeof query.archived === "boolean") filter.isArchived = query.archived;

  return filter;
}

export class TaskRepository {
  async create(data: TaskCreateData) {
    return TaskModel.create(data);
  }

  async findById(id: string) {
    return TaskModel.findById(id).populate(assigneePopulate).populate(reporterPopulate).lean();
  }

  async findByCode(taskCode: string) {
    return TaskModel.findOne({ taskCode }).select("_id").lean();
  }

  async list(query: ListTasksQuery) {
    const filter = buildTaskFilter(query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      TaskModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(query.limit)
        .populate(assigneePopulate)
        .populate(reporterPopulate)
        .lean(),
      TaskModel.countDocuments(filter),
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

  async listAll(query: ListTasksQuery) {
    return TaskModel.find(buildTaskFilter(query))
      .sort({ [query.sortBy]: query.sortOrder === "asc" ? 1 : -1 })
      .populate(assigneePopulate)
      .populate(reporterPopulate)
      .lean();
  }

  async listByProject(projectId: string) {
    return TaskModel.find({ projectId, isArchived: false })
      .sort({ createdAt: -1 })
      .populate(assigneePopulate)
      .populate(reporterPopulate)
      .lean();
  }

  async update(id: string, updates: UpdateQuery<TaskDocument>) {
    return TaskModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate(assigneePopulate)
      .populate(reporterPopulate)
      .lean();
  }

  async delete(id: string) {
    return TaskModel.findByIdAndDelete(id).select("_id").lean();
  }

  async bulkDelete(ids: string[]) {
    return TaskModel.deleteMany({ _id: { $in: ids } });
  }

  async bulkUpdate(ids: string[], updates: UpdateQuery<TaskDocument>) {
    return TaskModel.updateMany({ _id: { $in: ids } }, updates, {
      runValidators: true,
    });
  }

  async stats() {
    const now = new Date();
    const dueSoonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [stats] = await TaskModel.aggregate<{
      total: number;
      byStatus: { status: string; count: number }[];
      overdue: number;
      dueSoon: number;
      tracked: number;
    }>([
      { $match: { isArchived: false } },
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          overdue: [
            { $match: { status: { $ne: "Completed" }, dueDate: { $lt: now } } },
            { $count: "count" },
          ],
          dueSoon: [
            {
              $match: {
                status: { $ne: "Completed" },
                dueDate: { $gte: now, $lte: dueSoonThreshold },
              },
            },
            { $count: "count" },
          ],
          tracked: [{ $group: { _id: null, sum: { $sum: "$actualHours" } } }],
        },
      },
      {
        $project: {
          total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
          byStatus: {
            $map: {
              input: "$byStatus",
              as: "s",
              in: { status: "$$s._id", count: "$$s.count" },
            },
          },
          overdue: { $ifNull: [{ $arrayElemAt: ["$overdue.count", 0] }, 0] },
          dueSoon: { $ifNull: [{ $arrayElemAt: ["$dueSoon.count", 0] }, 0] },
          tracked: { $ifNull: [{ $arrayElemAt: ["$tracked.sum", 0] }, 0] },
        },
      },
    ]);

    return stats ?? { total: 0, byStatus: [], overdue: 0, dueSoon: 0, tracked: 0 };
  }
}

export const taskRepository = new TaskRepository();
