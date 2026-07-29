import { NotificationPreferenceModel } from "../models/notification-preference.model.js";
import type { ChannelPreference, NotificationCategory } from "../constants/notification.js";

export class NotificationPreferenceRepository {
  async findByUser(userId: string) {
    return NotificationPreferenceModel.findOne({ userId }).lean();
  }

  async upsert(userId: string, category: NotificationCategory, channelPreference: ChannelPreference) {
    return NotificationPreferenceModel.findOneAndUpdate(
      { userId },
      { $set: { [`preferences.${category}`]: channelPreference } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();
