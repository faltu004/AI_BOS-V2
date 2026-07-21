export type FinanceModule = "income" | "expenses" | "invoices" | "payments" | "taxes" | "budgets";
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";
export type PaymentStatus = "Completed" | "Pending" | "Failed";

export type FinanceRecord = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  owner: string;
  status: string;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  rate: number;
};

export type Invoice = {
  id: string;
  invoiceNo: string;
  customer: string;
  email: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  lastAction: string;
};

export type Payment = {
  id: string;
  customer: string;
  invoiceNo: string;
  amount: number;
  method: string;
  date: string;
  status: PaymentStatus;
};

export type TaxRecord = {
  id: string;
  name: string;
  period: string;
  taxableAmount: number;
  taxAmount: number;
  status: "Filed" | "Pending" | "Review";
};

export type Budget = {
  id: string;
  department: string;
  allocated: number;
  spent: number;
  owner: string;
};

export type ChartPoint = {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export type InvoiceFormInput = {
  customer: string;
  email: string;
  issueDate: string;
  dueDate: string;
  itemDescription: string;
  quantity: number;
  rate: number;
  taxRate: number;
};
