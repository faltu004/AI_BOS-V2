import type { CommentResourceType } from "../models/task-comment.model.js";
import { permissionService } from "../services/permission.service.js";
import { taskCommentService } from "../services/task-comment.service.js";
import { jsonController } from "../utils/controller.js";

function canModerate(role: string) {
  return permissionService.hasPermission(role, "collaboration.moderate");
}

export function createTaskCommentController(resourceType: CommentResourceType) {
  return {
    list: jsonController(200, "Comments fetched successfully", ({ req }) =>
      taskCommentService.listByResource(
        resourceType,
        req.params.id,
        req.query.page ? Number(req.query.page) : undefined,
        req.query.limit ? Number(req.query.limit) : undefined,
      ),
    ),

    create: jsonController(201, "Comment posted successfully", ({ req }) =>
      taskCommentService.create(resourceType, req.params.id, req.user!.id, req.body.body),
    ),

    update: jsonController(200, "Comment updated successfully", ({ req }) =>
      taskCommentService.update(req.params.commentId, req.user!.id, req.body.body),
    ),

    delete: jsonController(200, "Comment deleted successfully", async ({ req }) => {
      const moderate = await canModerate(req.user!.role);
      return taskCommentService.delete(req.params.commentId, req.user!.id, moderate);
    }),
  };
}

export const taskCommentController = createTaskCommentController("Task");
export const projectCommentController = createTaskCommentController("Project");
