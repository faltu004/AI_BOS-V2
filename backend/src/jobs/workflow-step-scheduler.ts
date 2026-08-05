import cron from "node-cron";
import { workflowService } from "../services/workflow.service.js";
import { logger } from "../utils/logger.js";

export function startWorkflowStepScheduler() {
  cron.schedule("* * * * *", () => {
    void workflowService.resumeDueDelays(new Date()).catch((error) => {
      logger.error(error, "Workflow delay-step scheduler sweep failed");
    });
  });

  logger.info("Workflow step scheduler started (every-minute sweep)");
}
