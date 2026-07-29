import type { FilterQuery, Types } from "mongoose";
import { NotificationModel, type Notification } from "../models/notification.model.js";
import type { NotificationCategory } from "../constants/notification.js";

export type NotificationCreateData = Pick<
  Notification,
  | "recipientUserId"
  | "actorUserId"
  | "type"
  | "category"
  | "priority"
  | "title"
  | "body"
  | "actionUrl"
  | "sourceType"
  | "sourceId"
  | "metadata"
  | "channels"
>;

export type NotificationListFilters = {
  category?: NotificationCategory;
  isRead?: boolean;
  search?: string;
};

export class NotificationRepository {
  async create(data: NotificationCreateData) {
    return NotificationModel.create({ ...data, isRead: false });
  }

  async list(recipientUserId: Types.ObjectId, limit: number, filters: NotificationListFilters = {}) {
    const filter: FilterQuery<Notification> = { recipientUserId };
    if (filters.category) filter.category = filters.category;
    if (typeof filters.isRead === "boolean") filter.isRead = filters.isRead;
    if (filters.search) {
      filter.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { body: { $regex: filters.search, $options: "i" } },
      ];
    }

    return NotificationModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async countUnread(recipientUserId: Types.ObjectId) {
    return NotificationModel.countDocuments({ recipientUserId, isRead: false });
  }

  async markRead(id: string, recipientUserId: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: id, recipientUserId },
      { $set: { isRead: true } },
      { new: true },
    ).lean();
  }

  async markAllRead(recipientUserId: string) {
    const result = await NotificationModel.updateMany(
      { recipientUserId, isRead: false },
      { $set: { isRead: true } },
    );
    return result.modifiedCount;
  }

  async markEmailSent(id: string) {
    await NotificationModel.updateOne({ _id: id }, { $set: { emailSentAt: new Date() } });
  }
}

export const notificationRepository = new NotificationRepository();
