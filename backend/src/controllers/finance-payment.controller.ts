import { financePaymentService } from "../services/finance-payment.service.js";
import { jsonController } from "../utils/controller.js";
import type { CreatePaymentInput, ListPaymentsQuery } from "../validation/finance-payment.validation.js";

export class FinancePaymentController {
  list = jsonController(200, "Payments fetched successfully", ({ req }) =>
    financePaymentService.list(req.query as unknown as ListPaymentsQuery),
  );

  create = jsonController(201, "Payment recorded successfully", ({ req }) =>
    financePaymentService.create(req.body as CreatePaymentInput, req.user?.id),
  );

  delete = jsonController(200, "Payment deleted successfully", ({ req }) =>
    financePaymentService.delete(req.params.id),
  );
}

export const financePaymentController = new FinancePaymentController();
