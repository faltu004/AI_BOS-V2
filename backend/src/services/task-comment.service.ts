import type { Types } from "mongoose";
import type { CommentResourceType } from "../models/task-comment.model.js";
import { taskCommentRepository } from "../repositories/task-comment.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { projectRepository } from "../repositories/project.repository.js";
import { notificationService } from "./notification.service.js";
import { getIO, personalRoom } from "../realtime/socket-server.js";
import { AppError } from "../utils/app-error.js";

function toPreview(body: string) {
  return body.length > 140 ? `${body.slice(0, 137)}...` : body;
}

async function resolveRecipients(resourceType: CommentResourceType, resourceId: string, authorId: string) {
  const recipients = new Set<string>();

  if (resourceType === "Task") {
    const task = await taskRepository.findById(resourceId);
    if (task?.assigneeId) recipients.add(String((task.assigneeId as { _id?: unknown })._id ?? task.assigneeId));
    if (task?.reporterId) recipients.add(String((task.reporterId as { _id?: unknown })._id ?? task.reporterId));
  } else {
    const project = await projectRepository.findById(resourceId);
    if (project?.createdBy) recipients.add(String(project.createdBy));
  }

  const priorComments = await taskCommentRepository.listByResource(resourceType, resourceId, 1, 100);
  for (const comment of priorComments.items) {
    const commentAuthorId = (comment.authorId as { _id?: unknown })._id ?? comment.authorId;
    recipients.add(String(commentAuthorId));
  }

  recipients.delete(authorId);
  return Array.from(recipients);
}

export class TaskCommentService {
  async create(resourceType: CommentResourceType, resourceId: string, authorId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new AppError("Comment body is required", 400);
    }

    const mentionedUserIds = notificationService.parseMentions(trimmed);

    const comment = await taskCommentRepository.create({
      resourceType,
      resourceId: resourceId as unknown as Types.ObjectId,
      authorId: authorId as unknown as Types.ObjectId,
      body: trimmed,
      mentionedUserIds,
    });

    const baseRecipients = await resolveRecipients(resourceType, resourceId, authorId);
    const mentionRecipients = mentionedUserIds.map((id) => id.toString());
    const recipientUserIds = Array.from(new Set([...baseRecipients, ...mentionRecipients])).filter(
      (id) => id !== authorId,
    );

    if (recipientUserIds.length > 0) {
      void notificationService.dispatch({
        recipientUserIds,
        type: `${resourceType.toLowerCase()}.comment.new`,
        category: "mention",
        title: `New comment on this ${resourceType.toLowerCase()}`,
        body: toPreview(trimmed),
        actionUrl: resourceType === "Task" ? `/tasks/${resourceId}` : `/projects/${resourceId}`,
        actorUserId: authorId,
        sourceType: resourceType,
        sourceId: resourceId,
      });

      const io = getIO();
      const eventName = resourceType === "Task" ? "task:comment:new" : "project:comment:new";
      for (const recipientUserId of recipientUserIds) {
        io?.to(personalRoom(recipientUserId)).emit(eventName, comment);
      }
    }

    return comment;
  }

  async listByResource(resourceType: CommentResourceType, resourceId: string, page = 1, limit = 50) {
    return taskCommentRepository.listByResource(resourceType, resourceId, page, limit);
  }

  async update(commentId: string, authorId: string, body: string) {
    const comment = await taskCommentRepository.findById(commentId);
    if (!comment || comment.deletedAt) {
      throw new AppError("Comment not found", 404);
    }
    if (comment.authorId.toString() !== authorId) {
      throw new AppError("You can only edit your own comments", 403);
    }

    const trimmed = body.trim();
    const mentionedUserIds = notificationService.parseMentions(trimmed);

    return taskCommentRepository.update(commentId, {
      body: trimmed,
      mentionedUserIds,
      editedAt: new Date(),
    });
  }

  async delete(commentId: string, authorId: string, canModerate: boolean) {
    const comment = await taskCommentRepository.findById(commentId);
    if (!comment || comment.deletedAt) {
      throw new AppError("Comment not found", 404);
    }
    if (comment.authorId.toString() !== authorId && !canModerate) {
      throw new AppError("You do not have permission to delete this comment", 403);
    }

    await taskCommentRepository.softDelete(commentId);
    return { deleted: true };
  }
}

export const taskCommentService = new TaskCommentService();
