import cron from "node-cron";
import { integrationService } from "../services/integration.service.js";
import { logger } from "../utils/logger.js";

export function startIntegrationSyncScheduler() {
  cron.schedule("*/5 * * * *", () => {
    void integrationService.runAutoSyncSweep().catch((error) => {
      logger.error(error, "Integration auto-sync sweep failed");
    });
  });

  logger.info("Integration auto-sync scheduler started (every-5-minute sweep)");
}
