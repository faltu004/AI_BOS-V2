import { scheduledNotificationService } from "../services/scheduled-notification.service.js";
import { jsonController } from "../utils/controller.js";
import type { CreateScheduledNotificationInput } from "../validation/scheduled-notification.validation.js";

export class ScheduledNotificationController {
  list = jsonController(200, "Scheduled notifications fetched successfully", ({ req }) =>
    scheduledNotificationService.listMine(req.user!.id, req.user!.role),
  );

  create = jsonController(201, "Scheduled notification created successfully", ({ req }) =>
    scheduledNotificationService.create(req.body as CreateScheduledNotificationInput, req.user!.id, req.user!.role),
  );

  cancel = jsonController(200, "Scheduled notification cancelled successfully", ({ req }) =>
    scheduledNotificationService.cancel(req.params.id, req.user!.id, req.user!.role),
  );
}

export const scheduledNotificationController = new ScheduledNotificationController();
