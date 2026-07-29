import { notificationPreferenceRepository } from "../repositories/notification-preference.repository.js";
import {
  defaultChannelPreference,
  notificationCategories,
  type ChannelPreference,
  type NotificationCategory,
} from "../constants/notification.js";

export class NotificationPreferenceService {
  async getEffective(userId: string, category: NotificationCategory): Promise<ChannelPreference> {
    const stored = await notificationPreferenceRepository.findByUser(userId);
    const override = stored?.preferences?.[category];
    return { ...defaultChannelPreference, ...override };
  }

  async getAllEffective(userId: string): Promise<Record<NotificationCategory, ChannelPreference>> {
    const stored = await notificationPreferenceRepository.findByUser(userId);

    return Object.fromEntries(
      notificationCategories.map((category) => [
        category,
        { ...defaultChannelPreference, ...stored?.preferences?.[category] },
      ]),
    ) as Record<NotificationCategory, ChannelPreference>;
  }

  async update(userId: string, category: NotificationCategory, channelPreference: ChannelPreference) {
    await notificationPreferenceRepository.upsert(userId, category, channelPreference);
    return this.getAllEffective(userId);
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
