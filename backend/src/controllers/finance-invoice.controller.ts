import { financeInvoiceService } from "../services/finance-invoice.service.js";
import { jsonController } from "../utils/controller.js";
import type { CreateInvoiceInput, ListInvoicesQuery } from "../validation/finance-invoice.validation.js";

export class FinanceInvoiceController {
  list = jsonController(200, "Invoices fetched successfully", ({ req }) =>
    financeInvoiceService.list(req.query as unknown as ListInvoicesQuery),
  );

  create = jsonController(201, "Invoice generated successfully", ({ req }) =>
    financeInvoiceService.create(req.body as CreateInvoiceInput, req.user?.id),
  );

  send = jsonController(200, "Invoice emailed successfully", ({ req }) =>
    financeInvoiceService.send(req.params.id),
  );

  delete = jsonController(200, "Invoice deleted successfully", ({ req }) =>
    financeInvoiceService.delete(req.params.id),
  );
}

export const financeInvoiceController = new FinanceInvoiceController();
