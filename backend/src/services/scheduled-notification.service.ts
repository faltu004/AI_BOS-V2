import { scheduledNotificationRepository } from "../repositories/scheduled-notification.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { permissionService } from "./permission.service.js";
import { notificationService } from "./notification.service.js";
import { AppError } from "../utils/app-error.js";
import type { ScheduledNotificationRecurrence } from "../models/scheduled-notification.model.js";
import type { RecurrenceFrequency } from "../constants/notification.js";
import type {
  CreateScheduledNotificationInput,
} from "../validation/scheduled-notification.validation.js";

function addInterval(date: Date, frequency: RecurrenceFrequency, interval: number): Date {
  const next = new Date(date);
  if (frequency === "daily") next.setDate(next.getDate() + interval);
  if (frequency === "weekly") next.setDate(next.getDate() + interval * 7);
  if (frequency === "monthly") next.setMonth(next.getMonth() + interval);
  return next;
}

export class ScheduledNotificationService {
  async create(input: CreateScheduledNotificationInput, userId: string, userRole: string) {
    const targetsOthers =
      (input.recipientRoles && input.recipientRoles.length > 0) ||
      input.recipientUserIds.some((id) => id !== userId);
    const targetsEveryone = input.recipientUserIds.length === 0 && (input.recipientRoles ?? []).length === 0;

    if (targetsOthers || targetsEveryone) {
      const canBroadcast = await permissionService.hasPermission(userRole, "notification.broadcast");
      if (!canBroadcast) {
        throw new AppError("You do not have permission to notify other people", 403);
      }
    }

    return scheduledNotificationRepository.create({
      createdBy: userId as never,
      recipientUserIds: input.recipientUserIds as never,
      recipientRoles: input.recipientRoles ?? [],
      title: input.title,
      body: input.body,
      category: input.category,
      priority: input.priority ?? "Medium",
      actionUrl: input.actionUrl,
      scheduledFor: input.scheduledFor,
      recurrence: input.recurrence,
      nextFireAt: input.scheduledFor,
    });
  }

  async listMine(userId: string, userRole: string) {
    const canBroadcast = await permissionService.hasPermission(userRole, "notification.broadcast");
    return canBroadcast ? scheduledNotificationRepository.listAll() : scheduledNotificationRepository.listCreatedBy(userId);
  }

  async cancel(id: string, userId: string, userRole: string) {
    const canBroadcast = await permissionService.hasPermission(userRole, "notification.broadcast");
    const scheduled = await scheduledNotificationRepository.cancel(id, userId, canBroadcast);
    if (!scheduled) {
      throw new AppError("Scheduled notification not found", 404);
    }
    return scheduled;
  }

  async resolveRecipients(scheduled: {
    recipientUserIds: { toString(): string }[];
    recipientRoles: string[];
  }): Promise<string[]> {
    if (scheduled.recipientUserIds.length === 0 && scheduled.recipientRoles.length === 0) {
      const allUsers = await userRepository.findAllActive();
      return allUsers.map((user) => (user._id as { toString(): string }).toString());
    }

    const explicitIds = scheduled.recipientUserIds.map((id) => id.toString());
    const roleUsers = scheduled.recipientRoles.length
      ? await userRepository.findActiveByRoles(scheduled.recipientRoles)
      : [];

    return Array.from(new Set([...explicitIds, ...roleUsers.map((user) => (user._id as { toString(): string }).toString())]));
  }

  computeNextFireAt(current: Date, recurrence: ScheduledNotificationRecurrence): Date | null {
    const next = addInterval(current, recurrence.frequency, recurrence.interval);
    if (recurrence.endDate && next > recurrence.endDate) {
      return null;
    }
    return next;
  }

  async runDueSweep(now: Date) {
    const due = await scheduledNotificationRepository.findDue(now);

    for (const scheduled of due) {
      const recipientUserIds = await this.resolveRecipients(scheduled);

      if (recipientUserIds.length > 0) {
        await notificationService.dispatch({
          recipientUserIds,
          type: scheduled.recurrence ? "recurring_notification" : "reminder",
          category: scheduled.category,
          priority: scheduled.priority,
          title: scheduled.title,
          body: scheduled.body,
          actionUrl: scheduled.actionUrl,
          actorUserId: (scheduled.createdBy as unknown as { toString(): string }).toString(),
          sourceType: "scheduled_notification",
          sourceId: (scheduled._id as unknown as { toString(): string }).toString(),
        });
      }

      if (scheduled.recurrence) {
        const next = this.computeNextFireAt(now, scheduled.recurrence);
        if (next) {
          await scheduledNotificationRepository.advance((scheduled._id as unknown as { toString(): string }).toString(), next, now);
          continue;
        }
      }

      await scheduledNotificationRepository.deactivate((scheduled._id as unknown as { toString(): string }).toString());
    }

    return due.length;
  }
}

export const scheduledNotificationService = new ScheduledNotificationService();
