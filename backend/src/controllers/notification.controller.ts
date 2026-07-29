import { notificationService } from "../services/notification.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListNotificationsQuery } from "../validation/notification.validation.js";

export class NotificationController {
  list = jsonController(200, "Notifications fetched successfully", ({ req }) => {
    const query = req.query as unknown as ListNotificationsQuery;
    return notificationService.list(req.user!.id, query.limit, {
      category: query.category,
      isRead: query.isRead,
      search: query.search,
    });
  });

  unreadCount = jsonController(200, "Unread notification count fetched successfully", ({ req }) =>
    notificationService.unreadCount(req.user!.id),
  );

  markRead = jsonController(200, "Notification marked as read", ({ req }) =>
    notificationService.markRead(req.params.id, req.user!.id),
  );

  markAllRead = jsonController(200, "All notifications marked as read", ({ req }) =>
    notificationService.markAllRead(req.user!.id),
  );
}

export const notificationController = new NotificationController();
