import {
  ScheduledNotificationModel,
  type ScheduledNotification,
} from "../models/scheduled-notification.model.js";

export type ScheduledNotificationCreateData = Omit<
  ScheduledNotification,
  "createdAt" | "updatedAt" | "isActive" | "lastFiredAt" | "timesFired" | "nextFireAt"
> & { nextFireAt: Date };

export class ScheduledNotificationRepository {
  async create(data: ScheduledNotificationCreateData) {
    return ScheduledNotificationModel.create({ ...data, isActive: true, timesFired: 0 });
  }

  async findById(id: string) {
    return ScheduledNotificationModel.findById(id);
  }

  async listCreatedBy(userId: string) {
    return ScheduledNotificationModel.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
  }

  async listAll() {
    return ScheduledNotificationModel.find({}).sort({ createdAt: -1 }).lean();
  }

  async findDue(now: Date) {
    return ScheduledNotificationModel.find({ isActive: true, nextFireAt: { $lte: now } });
  }

  async deactivate(id: string) {
    await ScheduledNotificationModel.updateOne({ _id: id }, { $set: { isActive: false } });
  }

  async advance(id: string, nextFireAt: Date, lastFiredAt: Date) {
    await ScheduledNotificationModel.updateOne(
      { _id: id },
      { $set: { nextFireAt, lastFiredAt }, $inc: { timesFired: 1 } },
    );
  }

  async cancel(id: string, userId: string, canBroadcast: boolean) {
    const filter = canBroadcast ? { _id: id } : { _id: id, createdBy: userId };
    return ScheduledNotificationModel.findOneAndUpdate(filter, { $set: { isActive: false } }, { new: true }).lean();
  }
}

export const scheduledNotificationRepository = new ScheduledNotificationRepository();
