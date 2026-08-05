import { financeBudgetService } from "../services/finance-budget.service.js";
import { jsonController } from "../utils/controller.js";
import type { CreateBudgetInput, UpdateBudgetInput } from "../validation/finance-budget.validation.js";

export class FinanceBudgetController {
  list = jsonController(200, "Budgets fetched successfully", () => financeBudgetService.list());

  create = jsonController(201, "Budget created successfully", ({ req }) =>
    financeBudgetService.create(req.body as CreateBudgetInput, req.user?.id),
  );

  update = jsonController(200, "Budget updated successfully", ({ req }) =>
    financeBudgetService.update(req.params.id, req.body as UpdateBudgetInput),
  );

  delete = jsonController(200, "Budget deleted successfully", ({ req }) =>
    financeBudgetService.delete(req.params.id),
  );
}

export const financeBudgetController = new FinanceBudgetController();
