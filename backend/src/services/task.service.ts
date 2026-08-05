import type { Types } from "mongoose";
import { taskRepository } from "../repositories/task.repository.js";
import { notificationService } from "./notification.service.js";
import { AppError } from "../utils/app-error.js";
import { toCsv } from "../utils/csv.js";
import { createSimplePdfBuffer } from "../utils/pdf.js";
import { generateTaskCode } from "../utils/task-code.js";
import type {
  BulkDeleteTasksInput,
  BulkUpdateTasksInput,
  CreateTaskInput,
  ListTasksQuery,
  LogTimeInput,
  UpdateTaskInput,
} from "../validation/task.validation.js";

function normalizeLabels(labels: string[]) {
  return [...new Set(labels.map((label) => label.trim().toLowerCase()).filter(Boolean))];
}

async function createUniqueTaskCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taskCode = generateTaskCode();
    const existingTask = await taskRepository.findByCode(taskCode);

    if (!existingTask) {
      return taskCode;
    }
  }

  throw new AppError("Unable to generate unique task code", 500);
}

function notifyAssignee(taskId: string, taskTitle: string, assigneeId: string, actorUserId?: string) {
  if (assigneeId === actorUserId) return;

  void notificationService.dispatch({
    recipientUserIds: [assigneeId],
    type: "task.assigned",
    category: "system",
    title: "You were assigned a task",
    body: taskTitle,
    actionUrl: `/tasks/${taskId}`,
    actorUserId,
    sourceType: "Task",
    sourceId: taskId,
  });
}

export class TaskService {
  async create(input: CreateTaskInput, userId?: string) {
    const taskCode = await createUniqueTaskCode();

    const task = await taskRepository.create({
      ...input,
      taskCode,
      labels: normalizeLabels(input.labels),
      reporterId: (input.reporterId ?? userId) as unknown as Types.ObjectId,
      projectId: input.projectId as unknown as Types.ObjectId,
      epicId: input.epicId as unknown as Types.ObjectId,
      sprintId: input.sprintId as unknown as Types.ObjectId,
      parentTaskId: input.parentTaskId as unknown as Types.ObjectId,
      backlogRank: input.backlogRank,
      assigneeId: input.assigneeId as unknown as Types.ObjectId,
      actualHours: 0,
      timeEntries: [],
      isArchived: false,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });

    if (input.assigneeId) {
      notifyAssignee((task._id as Types.ObjectId).toString(), task.title, input.assigneeId, userId);
    }

    return taskRepository.findById((task._id as Types.ObjectId).toString());
  }

  async list(query: ListTasksQuery) {
    return taskRepository.list(query);
  }

  async listByProject(projectId: string) {
    return taskRepository.listByProject(projectId);
  }

  async getById(id: string) {
    const task = await taskRepository.findById(id);

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    return task;
  }

  async update(id: string, input: UpdateTaskInput, userId?: string) {
    const existing = await taskRepository.findById(id);
    if (!existing) {
      throw new AppError("Task not found", 404);
    }

    const updates = {
      ...input,
      ...(input.labels ? { labels: normalizeLabels(input.labels) } : {}),
      updatedBy: userId,
    };

    const task = await taskRepository.update(id, updates);

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const existingAssigneeId = existing.assigneeId ? String((existing.assigneeId as { _id?: unknown })._id ?? existing.assigneeId) : undefined;
    if (input.assigneeId && input.assigneeId !== existingAssigneeId) {
      notifyAssignee(id, task.title, input.assigneeId, userId);
    }

    return task;
  }

  async delete(id: string) {
    const task = await taskRepository.delete(id);

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    return { deleted: true };
  }

  async bulkDelete(input: BulkDeleteTasksInput) {
    const result = await taskRepository.bulkDelete(input.ids);
    return { deletedCount: result.deletedCount };
  }

  async bulkUpdate(input: BulkUpdateTasksInput, userId?: string) {
    const result = await taskRepository.bulkUpdate(input.ids, {
      ...input.updates,
      updatedBy: userId,
    });

    return { modifiedCount: result.modifiedCount };
  }

  async updateChecklistItem(taskId: string, itemId: string, done: boolean, userId?: string) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const checklist = task.checklist.map((item) =>
      String(item._id) === itemId ? { ...item, done } : item,
    );

    const updated = await taskRepository.update(taskId, { checklist, updatedBy: userId });
    if (!updated) {
      throw new AppError("Task not found", 404);
    }

    return updated;
  }

  async logTime(taskId: string, input: LogTimeInput, userId?: string) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const timeEntries = [
      ...task.timeEntries,
      { userId: userId as unknown as Types.ObjectId, hours: input.hours, note: input.note, createdAt: new Date() },
    ];

    const updated = await taskRepository.update(taskId, {
      timeEntries,
      actualHours: task.actualHours + input.hours,
      updatedBy: userId,
    });

    if (!updated) {
      throw new AppError("Task not found", 404);
    }

    return updated;
  }

  async stats() {
    return taskRepository.stats();
  }

  async exportCsv(query: ListTasksQuery) {
    const tasks = await taskRepository.listAll(query);
    return toCsv(
      tasks.map((task) => ({
        taskCode: task.taskCode,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
      })),
      ["taskCode", "title", "status", "priority", "dueDate", "estimatedHours", "actualHours"],
    );
  }

  async exportPdf(query: ListTasksQuery) {
    const tasks = await taskRepository.listAll(query);
    const lines = tasks.map((task) => `${task.taskCode} - ${task.title} - ${task.status} - ${task.priority}`);

    return createSimplePdfBuffer("AI BOS Task Export", lines);
  }
}

export const taskService = new TaskService();
