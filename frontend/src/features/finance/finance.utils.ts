import type { FinanceRecord, Invoice, InvoiceFormInput } from "./finance.types";

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function generateInvoiceNo(invoices: Invoice[]) {
  return `INV-2026-${String(invoices.length + 1).padStart(3, "0")}`;
}

export function createInvoiceFromInput(input: InvoiceFormInput, invoices: Invoice[]): Invoice {
  const subtotal = input.quantity * input.rate;
  const tax = Math.round(subtotal * (input.taxRate / 100));
  const total = subtotal + tax;

  return {
    id: `inv-${Date.now()}`,
    invoiceNo: generateInvoiceNo(invoices),
    customer: input.customer,
    email: input.email,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    items: [{ description: input.itemDescription, quantity: input.quantity, rate: input.rate }],
    subtotal,
    tax,
    total,
    status: "Draft",
    lastAction: "Invoice generated",
  };
}

export function getFinanceStats(income: FinanceRecord[], expenses: FinanceRecord[], invoices: Invoice[]) {
  const monthlyRevenue = income.reduce((sum, record) => sum + record.amount, 0);
  const totalExpenses = expenses.reduce((sum, record) => sum + record.amount, 0);
  const outstandingPayments = invoices
    .filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  return {
    monthlyRevenue,
    expenses: totalExpenses,
    profit: monthlyRevenue - totalExpenses,
    outstandingPayments,
    cashFlow: monthlyRevenue - totalExpenses - outstandingPayments * 0.12,
  };
}

export function downloadInvoicePdf(invoice: Invoice) {
  const content = [
    `AI BOS Invoice ${invoice.invoiceNo}`,
    `Customer: ${invoice.customer}`,
    `Email: ${invoice.email}`,
    `Issue Date: ${invoice.issueDate}`,
    `Due Date: ${invoice.dueDate}`,
    "",
    ...invoice.items.map((item) => `${item.description} x ${item.quantity} @ ${formatMoney(item.rate)}`),
    "",
    `Subtotal: ${formatMoney(invoice.subtotal)}`,
    `Tax: ${formatMoney(invoice.tax)}`,
    `Total: ${formatMoney(invoice.total)}`,
  ].join("\n");
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${invoice.invoiceNo}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
