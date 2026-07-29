import { Types } from "mongoose";
import type { NotificationDocument } from "../models/notification.model.js";
import { notificationRepository, type NotificationListFilters } from "../repositories/notification.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { getIO, personalRoom } from "../realtime/socket-server.js";
import { emailService } from "./email.service.js";
import { whatsappService } from "./whatsapp.service.js";
import { pushService } from "./push.service.js";
import { notificationPreferenceService } from "./notification-preference.service.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import type { NotificationCategory, NotificationPriority } from "../constants/notification.js";

const mentionTokenPattern = /@[^()@\n]{1,120}\(([0-9a-fA-F]{24})\)/g;

export type DispatchParams = {
  recipientUserIds: string[];
  type: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  body: string;
  actionUrl?: string;
  actorUserId?: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
};

export class NotificationService {
  /**
   * Single entry point for every notification producer in the app (mentions,
   * policy publish, AI report completion, reminders/broadcasts). Creates the
   * in-app record honoring the recipient's channel preferences, pushes it in
   * realtime when connected, and best-effort dispatches email/whatsapp/push
   * without ever blocking or throwing back to the caller.
   */
  async dispatch(params: DispatchParams): Promise<NotificationDocument[]> {
    const uniqueRecipients = Array.from(new Set(params.recipientUserIds));
    const io = getIO();
    const results: NotificationDocument[] = [];

    for (const recipientUserId of uniqueRecipients) {
      const preference = await notificationPreferenceService.getEffective(recipientUserId, params.category);

      const notification = await notificationRepository.create({
        recipientUserId: recipientUserId as unknown as Types.ObjectId,
        actorUserId: params.actorUserId as unknown as Types.ObjectId,
        type: params.type,
        category: params.category,
        priority: params.priority ?? "Medium",
        title: params.title,
        body: params.body,
        actionUrl: params.actionUrl,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        metadata: params.metadata,
        channels: preference,
      });

      results.push(notification);

      if (preference.inApp) {
        io?.to(personalRoom(recipientUserId)).emit("notification:new", notification);
      }

      if (preference.email) {
        void userRepository
          .findById(recipientUserId)
          .then((user) => {
            if (!user?.email) return;
            return emailService.send({ to: user.email, subject: params.title, text: params.body }).then((sent) => {
              if (sent) void notificationRepository.markEmailSent((notification._id as Types.ObjectId).toString());
            });
          })
          .catch((error) => {
            logger.error(error, `Failed to dispatch email notification to user ${recipientUserId}`);
          });
      }

      if (preference.whatsapp) {
        void whatsappService.send({ body: params.body });
      }

      if (preference.push) {
        void pushService.send({ userId: recipientUserId, title: params.title, body: params.body });
      }
    }

    return results;
  }

  async list(userId: string, limit = 30, filters: NotificationListFilters = {}) {
    return notificationRepository.list(userId as unknown as Types.ObjectId, limit, filters);
  }

  async unreadCount(userId: string) {
    const count = await notificationRepository.countUnread(userId as unknown as Types.ObjectId);
    return { count };
  }

  async markRead(id: string, userId: string) {
    const notification = await notificationRepository.markRead(id, userId);
    if (!notification) {
      throw new AppError("Notification not found", 404);
    }
    return notification;
  }

  async markAllRead(userId: string) {
    const modified = await notificationRepository.markAllRead(userId);
    return { modified };
  }

  /**
   * The composer inserts mentions as `@FullName(userId)`; extract the ids.
   */
  parseMentions(body: string): Types.ObjectId[] {
    const ids = new Set<string>();
    for (const match of body.matchAll(mentionTokenPattern)) {
      ids.add(match[1]);
    }
    return Array.from(ids).map((id) => new Types.ObjectId(id));
  }
}

export const notificationService = new NotificationService();
