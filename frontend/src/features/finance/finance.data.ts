import type { Budget, ChartPoint, FinanceRecord, Invoice, Payment, TaxRecord } from "./finance.types";

export const incomeRecords: FinanceRecord[] = [
  { id: "inc-1", title: "AI BOS Enterprise Subscription", category: "SaaS", amount: 140000, date: "2026-07-05", owner: "Orbit Finance", status: "Received" },
  { id: "inc-2", title: "CRM Automation Setup", category: "Implementation", amount: 85000, date: "2026-07-09", owner: "Nova Retail", status: "Received" },
  { id: "inc-3", title: "Analytics Advisory", category: "Services", amount: 42000, date: "2026-07-14", owner: "Northstar Labs", status: "Pending" },
];

export const expenseRecords: FinanceRecord[] = [
  { id: "exp-1", title: "Cloud Infrastructure", category: "Hosting", amount: 26000, date: "2026-07-03", owner: "Engineering", status: "Paid" },
  { id: "exp-2", title: "Security Audit", category: "Compliance", amount: 18000, date: "2026-07-10", owner: "Operations", status: "Approved" },
  { id: "exp-3", title: "Team Software Licenses", category: "Tools", amount: 9400, date: "2026-07-16", owner: "HR", status: "Pending" },
];

export const seedInvoices: Invoice[] = [
  {
    id: "inv-1",
    invoiceNo: "INV-2026-001",
    customer: "Orbit Finance",
    email: "finance@orbitfinance.com",
    issueDate: "2026-07-05",
    dueDate: "2026-08-05",
    items: [{ description: "AI BOS Enterprise Platform", quantity: 1, rate: 140000 }],
    subtotal: 140000,
    tax: 25200,
    total: 165200,
    status: "Sent",
    lastAction: "Invoice emailed to customer",
  },
  {
    id: "inv-2",
    invoiceNo: "INV-2026-002",
    customer: "Nova Retail",
    email: "accounts@novaretail.com",
    issueDate: "2026-07-09",
    dueDate: "2026-07-30",
    items: [{ description: "CRM Automation Setup", quantity: 1, rate: 85000 }],
    subtotal: 85000,
    tax: 15300,
    total: 100300,
    status: "Paid",
    lastAction: "Payment received",
  },
  {
    id: "inv-3",
    invoiceNo: "INV-2026-003",
    customer: "Zenith Health",
    email: "billing@zenithhealth.com",
    issueDate: "2026-07-15",
    dueDate: "2026-08-15",
    items: [{ description: "AI Operating Workflow Discovery", quantity: 1, rate: 62000 }],
    subtotal: 62000,
    tax: 11160,
    total: 73160,
    status: "Draft",
    lastAction: "Draft generated",
  },
];

export const payments: Payment[] = [
  { id: "pay-1", customer: "Nova Retail", invoiceNo: "INV-2026-002", amount: 100300, method: "Bank Transfer", date: "2026-07-12", status: "Completed" },
  { id: "pay-2", customer: "Northstar Labs", invoiceNo: "INV-2026-004", amount: 42000, method: "Card", date: "2026-07-18", status: "Pending" },
  { id: "pay-3", customer: "Acme Cloud", invoiceNo: "INV-2026-005", amount: 48000, method: "ACH", date: "2026-07-16", status: "Completed" },
];

export const taxes: TaxRecord[] = [
  { id: "tax-1", name: "GST Output Tax", period: "Jul 2026", taxableAmount: 287000, taxAmount: 51660, status: "Review" },
  { id: "tax-2", name: "TDS Payable", period: "Jul 2026", taxableAmount: 53400, taxAmount: 5340, status: "Pending" },
  { id: "tax-3", name: "Quarterly Corporate Tax", period: "Q2 2026", taxableAmount: 410000, taxAmount: 86100, status: "Filed" },
];

export const budgets: Budget[] = [
  { id: "bud-1", department: "Engineering", allocated: 320000, spent: 214000, owner: "Sofia Alvarez" },
  { id: "bud-2", department: "Sales", allocated: 180000, spent: 126000, owner: "Maya Chen" },
  { id: "bud-3", department: "Operations", allocated: 220000, spent: 176000, owner: "Aman Verma" },
  { id: "bud-4", department: "Finance", allocated: 120000, spent: 54000, owner: "Arjun Mehta" },
];

export const financeChart: ChartPoint[] = [
  { label: "Jan", revenue: 124000, expenses: 68000, profit: 56000 },
  { label: "Feb", revenue: 138000, expenses: 72000, profit: 66000 },
  { label: "Mar", revenue: 152000, expenses: 79000, profit: 73000 },
  { label: "Apr", revenue: 171000, expenses: 86000, profit: 85000 },
  { label: "May", revenue: 188000, expenses: 92000, profit: 96000 },
  { label: "Jun", revenue: 206000, expenses: 99000, profit: 107000 },
  { label: "Jul", revenue: 267000, expenses: 53400, profit: 213600 },
];
