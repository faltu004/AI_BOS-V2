import { TaskCommentModel, type CommentResourceType, type TaskComment } from "../models/task-comment.model.js";

export type TaskCommentCreateData = Pick<TaskComment, "resourceType" | "resourceId" | "authorId" | "body" | "mentionedUserIds">;

const authorPopulate = { path: "authorId", select: "fullName email" };

export class TaskCommentRepository {
  async create(data: TaskCommentCreateData) {
    const comment = await TaskCommentModel.create(data);
    return comment.populate(authorPopulate);
  }

  async findById(id: string) {
    return TaskCommentModel.findById(id);
  }

  async listByResource(resourceType: CommentResourceType, resourceId: string, page: number, limit: number) {
    const filter = { resourceType, resourceId, deletedAt: null };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      TaskCommentModel.find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate(authorPopulate)
        .lean(),
      TaskCommentModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async update(id: string, updates: Partial<TaskComment>) {
    return TaskCommentModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).populate(authorPopulate);
  }

  async softDelete(id: string) {
    return TaskCommentModel.findByIdAndUpdate(id, { $set: { deletedAt: new Date() } }, { new: true });
  }
}

export const taskCommentRepository = new TaskCommentRepository();
