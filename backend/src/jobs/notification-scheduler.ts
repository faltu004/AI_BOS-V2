import cron from "node-cron";
import { scheduledNotificationService } from "../services/scheduled-notification.service.js";
import { logger } from "../utils/logger.js";

export function startNotificationScheduler() {
  cron.schedule("* * * * *", () => {
    void scheduledNotificationService.runDueSweep(new Date()).catch((error) => {
      logger.error(error, "Notification scheduler sweep failed");
    });
  });

  logger.info("Notification scheduler started (every-minute sweep)");
}
