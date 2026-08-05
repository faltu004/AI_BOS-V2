import { financeTransactionRepository } from "../repositories/finance-transaction.repository.js";
import { financeInvoiceRepository } from "../repositories/finance-invoice.repository.js";
import { resolveOrganizationId } from "./finance-transaction.service.js";

const chartMonths = 7;

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function lastMonthKeys(count: number) {
  const keys: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export class FinanceStatsService {
  async summary() {
    const organizationId = await resolveOrganizationId();

    const [monthlyRevenue, expenses, outstandingPayments, series] = await Promise.all([
      financeTransactionRepository.sumByType(organizationId, "Income"),
      financeTransactionRepository.sumByType(organizationId, "Expense"),
      financeInvoiceRepository.outstandingTotal(organizationId),
      financeTransactionRepository.monthlySeries(organizationId, chartMonths),
    ]);

    const profit = monthlyRevenue - expenses;
    const cashFlow = profit - outstandingPayments * 0.12;

    const monthKeys = lastMonthKeys(chartMonths);
    const byMonth = new Map<string, { revenue: number; expenses: number }>();
    for (const key of monthKeys) byMonth.set(key, { revenue: 0, expenses: 0 });

    for (const entry of series) {
      const bucket = byMonth.get(entry._id.month);
      if (!bucket) continue;
      if (entry._id.type === "Income") bucket.revenue = entry.total;
      if (entry._id.type === "Expense") bucket.expenses = entry.total;
    }

    const chart = monthKeys.map((key) => {
      const bucket = byMonth.get(key) ?? { revenue: 0, expenses: 0 };
      return {
        label: monthLabel(key),
        revenue: bucket.revenue,
        expenses: bucket.expenses,
        profit: bucket.revenue - bucket.expenses,
      };
    });

    return {
      monthlyRevenue,
      expenses,
      profit,
      outstandingPayments,
      cashFlow,
      chart,
    };
  }
}

export const financeStatsService = new FinanceStatsService();
