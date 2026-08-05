import { Router } from "express";
import { financeTransactionController } from "../controllers/finance-transaction.controller.js";
import { financeInvoiceController } from "../controllers/finance-invoice.controller.js";
import { financePaymentController } from "../controllers/finance-payment.controller.js";
import { financeTaxController } from "../controllers/finance-tax.controller.js";
import { financeBudgetController } from "../controllers/finance-budget.controller.js";
import { financeStatsController } from "../controllers/finance-stats.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createFinanceTransactionSchema,
  financeTransactionIdParamsSchema,
  listFinanceTransactionsQuerySchema,
  updateFinanceTransactionSchema,
} from "../validation/finance-transaction.validation.js";
import {
  createInvoiceSchema,
  invoiceIdParamsSchema,
  listInvoicesQuerySchema,
} from "../validation/finance-invoice.validation.js";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParamsSchema,
} from "../validation/finance-payment.validation.js";
import {
  createTaxRecordSchema,
  listTaxRecordsQuerySchema,
  taxRecordIdParamsSchema,
} from "../validation/finance-tax.validation.js";
import {
  budgetIdParamsSchema,
  createBudgetSchema,
  updateBudgetSchema,
} from "../validation/finance-budget.validation.js";

export const financeRoutes = Router();

financeRoutes.use(authenticate);

financeRoutes.get("/stats", ...route(requirePermission("finance.view"), financeStatsController.summary));

// Transactions (income + expenses)
financeRoutes.get(
  "/transactions",
  ...route(requirePermission("finance.view"), validate({ query: listFinanceTransactionsQuerySchema }), financeTransactionController.list),
);
financeRoutes.post(
  "/transactions",
  ...route(requirePermission("finance.create"), validate({ body: createFinanceTransactionSchema }), financeTransactionController.create),
);
financeRoutes.patch(
  "/transactions/:id",
  ...route(
    requirePermission("finance.update"),
    validate({ params: financeTransactionIdParamsSchema, body: updateFinanceTransactionSchema }),
    financeTransactionController.update,
  ),
);
financeRoutes.delete(
  "/transactions/:id",
  ...route(requirePermission("finance.delete"), validate({ params: financeTransactionIdParamsSchema }), financeTransactionController.delete),
);

// Invoices
financeRoutes.get(
  "/invoices",
  ...route(requirePermission("finance.view"), validate({ query: listInvoicesQuerySchema }), financeInvoiceController.list),
);
financeRoutes.post(
  "/invoices",
  ...route(requirePermission("finance.create"), validate({ body: createInvoiceSchema }), financeInvoiceController.create),
);
financeRoutes.post(
  "/invoices/:id/send",
  ...route(requirePermission("finance.update"), validate({ params: invoiceIdParamsSchema }), financeInvoiceController.send),
);
financeRoutes.delete(
  "/invoices/:id",
  ...route(requirePermission("finance.delete"), validate({ params: invoiceIdParamsSchema }), financeInvoiceController.delete),
);

// Payments
financeRoutes.get(
  "/payments",
  ...route(requirePermission("finance.view"), validate({ query: listPaymentsQuerySchema }), financePaymentController.list),
);
financeRoutes.post(
  "/payments",
  ...route(requirePermission("finance.create"), validate({ body: createPaymentSchema }), financePaymentController.create),
);
financeRoutes.delete(
  "/payments/:id",
  ...route(requirePermission("finance.delete"), validate({ params: paymentIdParamsSchema }), financePaymentController.delete),
);

// Taxes
financeRoutes.get(
  "/taxes",
  ...route(requirePermission("finance.view"), validate({ query: listTaxRecordsQuerySchema }), financeTaxController.list),
);
financeRoutes.post(
  "/taxes",
  ...route(requirePermission("finance.create"), validate({ body: createTaxRecordSchema }), financeTaxController.create),
);
financeRoutes.delete(
  "/taxes/:id",
  ...route(requirePermission("finance.delete"), validate({ params: taxRecordIdParamsSchema }), financeTaxController.delete),
);

// Budgets
financeRoutes.get("/budgets", ...route(requirePermission("finance.view"), financeBudgetController.list));
financeRoutes.post(
  "/budgets",
  ...route(requirePermission("finance.create"), validate({ body: createBudgetSchema }), financeBudgetController.create),
);
financeRoutes.patch(
  "/budgets/:id",
  ...route(
    requirePermission("finance.update"),
    validate({ params: budgetIdParamsSchema, body: updateBudgetSchema }),
    financeBudgetController.update,
  ),
);
financeRoutes.delete(
  "/budgets/:id",
  ...route(requirePermission("finance.delete"), validate({ params: budgetIdParamsSchema }), financeBudgetController.delete),
);
