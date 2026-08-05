import { financeTransactionService } from "../services/finance-transaction.service.js";
import { jsonController } from "../utils/controller.js";
import type {
  CreateFinanceTransactionInput,
  ListFinanceTransactionsQuery,
  UpdateFinanceTransactionInput,
} from "../validation/finance-transaction.validation.js";

export class FinanceTransactionController {
  list = jsonController(200, "Finance transactions fetched successfully", ({ req }) =>
    financeTransactionService.list(req.query as unknown as ListFinanceTransactionsQuery),
  );

  create = jsonController(201, "Finance transaction created successfully", ({ req }) =>
    financeTransactionService.create(req.body as CreateFinanceTransactionInput, req.user?.id),
  );

  update = jsonController(200, "Finance transaction updated successfully", ({ req }) =>
    financeTransactionService.update(req.params.id, req.body as UpdateFinanceTransactionInput),
  );

  delete = jsonController(200, "Finance transaction deleted successfully", ({ req }) =>
    financeTransactionService.delete(req.params.id),
  );
}

export const financeTransactionController = new FinanceTransactionController();
