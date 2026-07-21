import { analyticsData, analyticsKpis } from "@/features/analytics/analytics.data";
import {
  companies,
  contacts,
  deals,
  followUps,
  meetings as crmMeetings,
  opportunities,
  quotes,
  seedCustomers,
  seedLeads,
} from "@/features/crm/crm.data";
import { seedDocuments } from "@/features/documents/documents.data";
import {
  departments,
  designations,
  holidays,
  seedAttendance,
  seedEmployees,
  seedLeaveRequests,
} from "@/features/employees/employees.data";
import {
  budgets,
  expenseRecords,
  financeChart,
  incomeRecords,
  payments,
  seedInvoices,
  taxes,
} from "@/features/finance/finance.data";
import { seedMeetings } from "@/features/meetings/meetings.data";
import { seedProducts } from "@/features/products/products.data";
import { seedProjects } from "@/features/projects/projects.data";
import { seedTasks } from "@/features/tasks/tasks.data";
import type { BusinessSnapshot } from "./business-intelligence.types";

export function buildBusinessSnapshot(): BusinessSnapshot {
  return {
    analytics: analyticsData,
    analyticsKpis,
    crm: {
      leads: seedLeads,
      customers: seedCustomers,
      companies,
      contacts,
      deals,
      opportunities,
      quotes,
      followUps,
      meetings: crmMeetings,
    },
    documents: seedDocuments,
    employees: {
      employees: seedEmployees,
      attendance: seedAttendance,
      leaveRequests: seedLeaveRequests,
      departments,
      designations,
      holidays,
    },
    finance: {
      income: incomeRecords,
      expenses: expenseRecords,
      invoices: seedInvoices,
      payments,
      taxes,
      budgets,
      chart: financeChart,
    },
    meetings: seedMeetings,
    products: seedProducts,
    projects: seedProjects,
    tasks: seedTasks,
    snapshotVersion: "phase-1-business-modules",
  };
}
