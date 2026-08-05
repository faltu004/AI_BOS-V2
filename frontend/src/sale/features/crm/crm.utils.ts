import type { Customer, Lead, LeadFormInput, LeadStage } from "./crm.types";

export function generateLeadCode(leads: Lead[]) {
 return `LEAD-2026-${String(leads.length + 1).padStart(3, "0")}`;
}

export function createLeadFromInput(input: LeadFormInput, leads: Lead[]): Lead {
 const now = new Date().toISOString().slice(0, 10);

 return {
 ...input,
 id: `lead-${Date.now()}`,
 leadCode: generateLeadCode(leads),
 activityTimeline: [{ id: `activity-${Date.now()}`, title: "Lead created", detail: "New lead added to CRM", time: "Now" }],
 createdAt: now,
 };
}

export function convertLeadToCustomer(lead: Lead): Customer {
 return {
 id: `cust-${Date.now()}`,
 name: lead.name,
 company: lead.company,
 email: lead.email,
 revenue: lead.value,
 owner: lead.salesperson,
 health: "Good",
 };
}

export function getCrmStats(leads: Lead[], customers: Customer[]) {
 const wonLeads = leads.filter((lead) => lead.stage === "Won").length;
 const revenue = customers.reduce((sum, customer) => sum + customer.revenue, 0) + leads.filter((lead) => lead.stage !== "Lost").reduce((sum, lead) => sum + lead.value, 0);
 const conversionRate = leads.length > 0 ? Math.round(((wonLeads + customers.length) / (leads.length + customers.length)) * 100) : 0;

 return {
 customers: customers.length,
 leads: leads.length,
 revenue,
 conversionRate,
 };
}

export function formatMoney(value: number) {
 return new Intl.NumberFormat("en-US", {
 currency: "USD",
 maximumFractionDigits: 0,
 style: "currency",
 }).format(value);
}

export function stageClass(stage: LeadStage) {
 const classes: Record<LeadStage, string> = {
 New: "bg-muted text-muted-foreground",
 Contacted: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
 Qualified: "bg-primary/10 text-primary",
 Proposal: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
 Negotiation: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
 Won: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
 Lost: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
 };

 return classes[stage];
}
