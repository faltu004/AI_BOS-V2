import cron from "node-cron";
import { backupService } from "../services/backup.service.js";
import { logger } from "../utils/logger.js";

export function startBackupScheduler() {
  cron.schedule("0 * * * *", () => {
    void backupService.runDueSweep(new Date()).catch((error) => {
      logger.error(error, "Backup scheduler sweep failed");
    });
  });

  logger.info("Backup scheduler started (hourly sweep)");
}
