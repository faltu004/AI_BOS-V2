import { notificationPreferenceService } from "../services/notification-preference.service.js";
import { jsonController } from "../utils/controller.js";
import type { UpdateNotificationPreferenceInput } from "../validation/notification-preference.validation.js";

export class NotificationPreferenceController {
  getAll = jsonController(200, "Notification preferences fetched successfully", ({ req }) =>
    notificationPreferenceService.getAllEffective(req.user!.id),
  );

  update = jsonController(200, "Notification preference updated successfully", ({ req }) => {
    const input = req.body as UpdateNotificationPreferenceInput;
    return notificationPreferenceService.update(req.user!.id, input.category, input.channels);
  });
}

export const notificationPreferenceController = new NotificationPreferenceController();
