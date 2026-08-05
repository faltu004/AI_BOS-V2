import { financeStatsService } from "../services/finance-stats.service.js";
import { jsonController } from "../utils/controller.js";

export class FinanceStatsController {
  summary = jsonController(200, "Finance stats fetched successfully", () => financeStatsService.summary());
}

export const financeStatsController = new FinanceStatsController();
