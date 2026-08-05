import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { notifyLocalDataChanged } from "@shared/realtime/data-sync";

export type FinanceTransactionType = "Income" | "Expense";

export type FinanceTransactionRecord = {
 _id?: string;
 id?: string;
 type: FinanceTransactionType;
 title: string;
 category: string;
 amount: number;
 date: string;
 owner: string;
 status: string;
};

export type FinanceTransactionPayload = Omit<FinanceTransactionRecord, "_id" | "id">;

export type InvoiceLineItem = { description: string; quantity: number; rate: number };

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

export type InvoiceRecord = {
 _id?: string;
 id?: string;
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

export type InvoiceCreatePayload = {
 customer: string;
 email: string;
 issueDate: string;
 dueDate: string;
 itemDescription: string;
 quantity: number;
 rate: number;
 taxRate: number;
};

export type PaymentStatus = "Completed" | "Pending" | "Failed";

export type PaymentRecord = {
 _id?: string;
 id?: string;
 customer: string;
 invoiceNo: string;
 amount: number;
 method: string;
 date: string;
 status: PaymentStatus;
};

export type PaymentPayload = Omit<PaymentRecord, "_id" | "id">;

export type TaxRecordStatus = "Filed" | "Pending" | "Review";

export type TaxRecordEntry = {
 _id?: string;
 id?: string;
 name: string;
 period: string;
 taxableAmount: number;
 taxAmount: number;
 status: TaxRecordStatus;
};

export type TaxRecordPayload = Omit<TaxRecordEntry, "_id" | "id">;

export type BudgetRecord = {
 _id?: string;
 id?: string;
 department: string;
 allocated: number;
 spent: number;
 owner: string;
};

export type BudgetPayload = Omit<BudgetRecord, "_id" | "id">;

export type FinanceChartPoint = { label: string; revenue: number; expenses: number; profit: number };

export type FinanceStats = {
 monthlyRevenue: number;
 expenses: number;
 profit: number;
 outstandingPayments: number;
 cashFlow: number;
 chart: FinanceChartPoint[];
};

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function requestJson<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
 cache: "no-store",
 ...init,
 headers: {
 ...(init.body ? { "Content-Type": "application/json" } : {}),
 ...(init.headers ?? {}),
 ...(await getSessionHeader()),
 },
 });
 const json = await response.json().catch(() => null);

 if (!response.ok) {
 const fieldErrors =
 json?.errors && typeof json.errors === "object"
 ? Object.values(json.errors).flat().filter((value): value is string => typeof value === "string")
 : [];
 throw new Error(fieldErrors[0] ?? json?.message ?? "Finance request failed.");
 }

 return json.data as T;
}

function notifyFinanceChanged(path: string) {
 notifyLocalDataChanged({ at: new Date().toISOString(), method: "POST", path, resource: "finance" });
}

export function fetchFinanceStats() {
 return requestJson<FinanceStats>("/finance/stats");
}

export function fetchFinanceTransactions(type?: FinanceTransactionType) {
 const query = type ? `?type=${type}` : "";
 return requestJson<FinanceTransactionRecord[]>(`/finance/transactions${query}`);
}

export async function createFinanceTransaction(payload: FinanceTransactionPayload) {
 const record = await requestJson<FinanceTransactionRecord>("/finance/transactions", {
 method: "POST",
 body: JSON.stringify(payload),
 });
 notifyFinanceChanged("/finance/transactions");
 return record;
}

export function fetchInvoices() {
 return requestJson<InvoiceRecord[]>("/finance/invoices");
}

export async function createInvoice(payload: InvoiceCreatePayload) {
 const record = await requestJson<InvoiceRecord>("/finance/invoices", {
 method: "POST",
 body: JSON.stringify(payload),
 });
 notifyFinanceChanged("/finance/invoices");
 return record;
}

export async function sendInvoice(id: string) {
 const record = await requestJson<InvoiceRecord>(`/finance/invoices/${id}/send`, { method: "POST" });
 notifyFinanceChanged(`/finance/invoices/${id}/send`);
 return record;
}

export function fetchPayments() {
 return requestJson<PaymentRecord[]>("/finance/payments");
}

export async function createPayment(payload: PaymentPayload) {
 const record = await requestJson<PaymentRecord>("/finance/payments", {
 method: "POST",
 body: JSON.stringify(payload),
 });
 notifyFinanceChanged("/finance/payments");
 return record;
}

export function fetchTaxRecords() {
 return requestJson<TaxRecordEntry[]>("/finance/taxes");
}

export async function createTaxRecord(payload: TaxRecordPayload) {
 const record = await requestJson<TaxRecordEntry>("/finance/taxes", {
 method: "POST",
 body: JSON.stringify(payload),
 });
 notifyFinanceChanged("/finance/taxes");
 return record;
}

export function fetchBudgets() {
 return requestJson<BudgetRecord[]>("/finance/budgets");
}

export async function createBudget(payload: BudgetPayload) {
 const record = await requestJson<BudgetRecord>("/finance/budgets", {
 method: "POST",
 body: JSON.stringify(payload),
 });
 notifyFinanceChanged("/finance/budgets");
 return record;
}
