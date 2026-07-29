import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ContactRound,
  FileText,
  Package,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import type { AuthRole } from "@shared/auth/types";
import { ProfessionalDashboard, type ProfessionalDashboardConfig } from "@shared/platform/ProfessionalDashboard";
import { DashboardPage as FullAccessDashboard } from "./DashboardPage";

const commonNav = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: BriefcaseBusiness },
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "Meetings", href: "/meetings", icon: CalendarDays },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
];

const supportNav = [
  ...commonNav,
  {
    label: "Support",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
];

type FrontlineDashboardRole = "Employee" | "HR" | "Finance" | "Sales" | "Support" | "Developer" | "Guest";

const roleDashboards: Record<FrontlineDashboardRole, ProfessionalDashboardConfig> = {
  Employee: {
    storageKey: "employee",
    eyebrow: "Employee Workspace",
    title: "Employee Dashboard",
    subtitle: "A focused operating view for your assigned work, documents, meetings, and support.",
    roleLabel: "Employee",
    navGroups: commonNav,
    stats: [
      { label: "Open Tasks", value: "14", trend: "3 due today", icon: CheckSquare, href: "/tasks" },
      { label: "Meetings", value: "3", trend: "Today", icon: CalendarDays, href: "/meetings" },
      { label: "Documents", value: "28", trend: "Shared", icon: FileText, href: "/documents" },
      { label: "Productivity", value: "91%", trend: "+6%", icon: TrendingUp },
    ],
    primaryActions: [
      { label: "My Tasks", href: "/tasks", icon: CheckSquare, note: "Assignments, priorities, and completion tracking" },
      { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Daily schedule, recordings, and action items" },
      { label: "Documents", href: "/documents", icon: FileText, note: "Shared files, reports, and personal uploads" },
      { label: "Messenger", href: "/messenger", icon: FileText, note: "Coordinate with your team and share updates" },
    ],
    queue: [
      { title: "Finish onboarding checklist", meta: "Due today - HR", priority: "High" },
      { title: "Upload weekly status report", meta: "Project workspace", priority: "Medium" },
      { title: "Prepare client notes", meta: "3:00 PM meeting", priority: "Medium" },
    ],
    activity: [
      { title: "Task completed", detail: "Dashboard QA checklist marked done", time: "18 min ago", icon: CheckCircle2 },
      { title: "Meeting added", detail: "Project standup added to today's schedule", time: "Today", icon: CalendarDays },
      { title: "Document uploaded", detail: "Status report saved in Documents", time: "Yesterday", icon: FileText },
    ],
    insights: [
      "Two high-priority tasks can be completed before the 3 PM meeting.",
      "Your most used modules this week are Tasks, Documents, and Meetings.",
      "Review today's project sync notes before the 3 PM meeting.",
    ],
    focus: ["Limited employee access", "Tasks and meetings", "Documents and support", "Personal profile"],
  },
  HR: {
    storageKey: "hr",
    eyebrow: "People Operations",
    title: "HR Dashboard",
    subtitle: "A professional HR control center for employees, onboarding, HR tasks, documents, and people signals.",
    roleLabel: "HR",
    navGroups: [
      ...commonNav,
      { label: "People", items: [{ label: "Employees", href: "/employees", icon: UsersRound }] },
    ],
    stats: [
      { label: "Employees", value: "248", trend: "+12 this month", icon: UsersRound, href: "/employees" },
      { label: "Open HR Tasks", value: "21", trend: "5 urgent", icon: CheckSquare, href: "/tasks" },
      { label: "Onboarding", value: "9", trend: "In progress", icon: UserRound, href: "/employees" },
      { label: "Policy Docs", value: "36", trend: "3 updates", icon: FileText, href: "/documents" },
    ],
    primaryActions: [
      { label: "Employees", href: "/employees", icon: UsersRound, note: "Employee records, departments, and onboarding" },
      { label: "HR Tasks", href: "/tasks", icon: CheckSquare, note: "Approvals, documents, and people operations" },
      { label: "Documents", href: "/documents", icon: FileText, note: "Policies, contracts, and HR files" },
      { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Interviews, check-ins, and reviews" },
    ],
    queue: [
      { title: "Approve joining kit", meta: "4 new hires", priority: "High" },
      { title: "Review attendance variance", meta: "This week", priority: "Medium" },
      { title: "Update leave policy", meta: "Shared documents", priority: "Medium" },
    ],
    activity: [
      { title: "Employee added", detail: "New HR profile added to onboarding", time: "42 min ago", icon: UsersRound },
      { title: "Policy updated", detail: "Leave policy draft moved to review", time: "Today", icon: FileText },
      { title: "Interview scheduled", detail: "Candidate check-in created", time: "Yesterday", icon: CalendarDays },
    ],
    insights: [
      "Three onboarding tasks need attention before end of day.",
      "Employee policy changes should be reviewed before publishing.",
      "Attendance exceptions should be prepared for manager review.",
    ],
    focus: ["Employee records", "Onboarding", "HR documents", "People tasks"],
  },
  Finance: {
    storageKey: "finance",
    eyebrow: "Finance Workspace",
    title: "Finance Dashboard",
    subtitle: "A focused finance view for invoices, collections, documents, and meetings.",
    roleLabel: "Finance",
    navGroups: [
      ...commonNav,
      { label: "Finance", items: [{ label: "Finance", href: "/finance", icon: WalletCards }] },
    ],
    stats: [
      { label: "Pending Invoices", value: "11", trend: "4 due this week", icon: WalletCards, href: "/finance" },
      { label: "Open Tasks", value: "18", trend: "5 approvals", icon: CheckSquare, href: "/tasks" },
      { label: "Finance Docs", value: "24", trend: "6 shared", icon: FileText, href: "/documents" },
      { label: "Collection Health", value: "92%", trend: "+3%", icon: TrendingUp },
    ],
    primaryActions: [
      { label: "Finance", href: "/finance", icon: WalletCards, note: "Invoices, payments, budgets, and collections" },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Approvals, reminders, and finance follow-ups" },
      { label: "Documents", href: "/documents", icon: FileText, note: "Invoices, reports, policies, and shared files" },
      { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Reviews, vendor calls, and internal syncs" },
    ],
    queue: [
      { title: "Review cloud infrastructure expense", meta: "Approval pending", priority: "High" },
      { title: "Prepare billing milestone summary", meta: "SecurePay account", priority: "Medium" },
      { title: "Upload July reconciliation sheet", meta: "Finance documents", priority: "Medium" },
    ],
    activity: [
      { title: "Invoice marked paid", detail: "SecurePay milestone payment received", time: "Today", icon: WalletCards },
      { title: "Document shared", detail: "Budget review uploaded", time: "Yesterday", icon: FileText },
      { title: "Task created", detail: "Cloud spend review assigned", time: "2 days ago", icon: CheckCircle2 },
    ],
    insights: [
      "Two high-value invoices should be followed up before Friday.",
      "Cloud infrastructure expense needs a second review before approval.",
      "Monthly collections should be summarized from Finance records.",
    ],
    focus: ["Finance access", "Invoices and payments", "Documents", "Tasks and meetings"],
  },
  Sales: {
    storageKey: "sales",
    eyebrow: "Revenue Desk",
    title: "Sales Dashboard",
    subtitle: "A focused sales operating view for CRM, finance follow-ups, products, pipeline, and revenue actions.",
    roleLabel: "Sales",
    navGroups: [
      ...commonNav,
      {
        label: "Revenue",
        items: [
          { label: "CRM", href: "/crm", icon: ContactRound },
          { label: "Finance", href: "/finance", icon: WalletCards },
          { label: "Products", href: "/products", icon: Package },
        ],
      },
    ],
    stats: [
      { label: "Pipeline", value: "$412K", trend: "+18%", icon: WalletCards, href: "/crm" },
      { label: "Active Leads", value: "64", trend: "12 hot", icon: ContactRound, href: "/crm" },
      { label: "Products", value: "312", trend: "14 low stock", icon: Package, href: "/products" },
      { label: "Win Rate", value: "38%", trend: "+4%", icon: TrendingUp },
    ],
    primaryActions: [
      { label: "CRM", href: "/crm", icon: ContactRound, note: "Leads, customers, deals, and follow-ups" },
      { label: "Finance", href: "/finance", icon: WalletCards, note: "Invoices, revenue, payments, and collections" },
      { label: "Products", href: "/products", icon: Package, note: "Catalog, stock, pricing, and availability" },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Sales tasks and customer reminders" },
    ],
    queue: [
      { title: "Call Orbit Finance", meta: "$82K opportunity", priority: "High" },
      { title: "Send renewal quote", meta: "Due tomorrow", priority: "Medium" },
      { title: "Update product forecast", meta: "Q3 revenue plan", priority: "Medium" },
    ],
    activity: [
      { title: "Deal updated", detail: "Orbit Finance moved to proposal", time: "10 min ago", icon: ContactRound },
      { title: "Invoice generated", detail: "Renewal quote prepared", time: "Today", icon: WalletCards },
      { title: "Product forecast changed", detail: "Q3 catalog forecast updated", time: "Yesterday", icon: Package },
    ],
    insights: [
      "The highest-value follow-up is Orbit Finance at $82K.",
      "Renewal quotes due tomorrow can improve this week's forecast.",
      "Product availability check is recommended before sending enterprise proposals.",
    ],
    focus: ["CRM pipeline", "Sales finance", "Products", "Revenue tasks"],
  },
  Support: {
    storageKey: "support",
    eyebrow: "Customer Support",
    title: "Support Dashboard",
    subtitle: "A focused workspace for support tasks, knowledge, customer notes, meetings, and collaboration.",
    roleLabel: "Support",
    navGroups: supportNav,
    stats: [
      { label: "Open Tickets", value: "27", trend: "6 priority", icon: CheckSquare, href: "/tasks" },
      { label: "Support Docs", value: "42", trend: "8 updated", icon: FileText, href: "/documents" },
      { label: "Meetings", value: "4", trend: "Today", icon: CalendarDays, href: "/meetings" },
      { label: "SLA Health", value: "95%", trend: "+2%", icon: TrendingUp },
    ],
    primaryActions: [
      { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Support queues, escalations, and follow-ups" },
      { label: "Documents", href: "/documents", icon: FileText, note: "Search support articles and product docs" },
      { label: "Documents", href: "/documents", icon: FileText, note: "Runbooks, reports, and shared files" },
      { label: "Messenger", href: "/messenger", icon: FileText, note: "Coordinate escalations with the team" },
    ],
    queue: [
      { title: "Resolve onboarding support ticket", meta: "Priority customer", priority: "High" },
      { title: "Update troubleshooting runbook", meta: "Knowledge base", priority: "Medium" },
      { title: "Summarize customer feedback", meta: "Weekly review", priority: "Medium" },
    ],
    activity: [
      { title: "Ticket updated", detail: "Billing workflow issue moved to review", time: "15 min ago", icon: CheckCircle2 },
      { title: "Support article opened", detail: "Setup guide", time: "Today", icon: FileText },
      { title: "Meeting scheduled", detail: "Customer escalation sync", time: "Yesterday", icon: CalendarDays },
    ],
    insights: [
      "One priority support item needs engineering input.",
      "Knowledge base search can reduce repeated escalation time.",
      "Customer feedback is trending around setup documentation.",
    ],
    focus: ["Support access", "Tasks", "Documents", "Messenger"],
  },
  Developer: {
    storageKey: "developer",
    eyebrow: "Developer Workspace",
    title: "Developer Dashboard",
    subtitle: "A focused engineering view for delivery tasks, docs, meetings, and technical context.",
    roleLabel: "Developer",
    navGroups: commonNav,
    stats: [
      { label: "Dev Tasks", value: "19", trend: "4 in review", icon: CheckSquare, href: "/tasks" },
      { label: "Docs", value: "31", trend: "Engineering", icon: FileText, href: "/documents" },
      { label: "Meetings", value: "3", trend: "Today", icon: CalendarDays, href: "/meetings" },
      { label: "Delivery Score", value: "89%", trend: "+5%", icon: TrendingUp },
    ],
    primaryActions: [
      { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Assigned engineering work and reviews" },
      { label: "Documents", href: "/documents", icon: FileText, note: "Specs, architecture notes, and runbooks" },
      { label: "Documents", href: "/documents", icon: FileText, note: "Search internal technical context" },
      { label: "Messenger", href: "/messenger", icon: FileText, note: "Ask teammates for summaries and implementation help" },
    ],
    queue: [
      { title: "Review API validation changes", meta: "NexOps sprint", priority: "High" },
      { title: "Update deployment notes", meta: "Release checklist", priority: "Medium" },
      { title: "Join backend standup", meta: "11:30 AM", priority: "Medium" },
    ],
    activity: [
      { title: "Task completed", detail: "Messenger responsive layout verified", time: "Today", icon: CheckCircle2 },
      { title: "Document viewed", detail: "NexOps API contract", time: "Yesterday", icon: FileText },
      { title: "Sprint notes updated", detail: "Sprint blockers summarized", time: "Yesterday", icon: FileText },
    ],
    insights: [
      "Two review tasks are blocking the next release candidate.",
      "Deployment notes should be updated before handoff.",
      "Sprint blockers should be summarized before handoff.",
    ],
    focus: ["Developer access", "Tasks", "Technical context", "Documents"],
  },
  Guest: {
    storageKey: "guest",
    eyebrow: "Guest Workspace",
    title: "Guest Dashboard",
    subtitle: "A limited workspace for shared documents, assigned meetings, approved tasks, and collaboration.",
    roleLabel: "Guest",
    navGroups: commonNav,
    stats: [
      { label: "Assigned Tasks", value: "5", trend: "2 due", icon: CheckSquare, href: "/tasks" },
      { label: "Shared Docs", value: "12", trend: "Read-only", icon: FileText, href: "/documents" },
      { label: "Meetings", value: "2", trend: "This week", icon: CalendarDays, href: "/meetings" },
      { label: "Access Scope", value: "Limited", trend: "Guest", icon: UserRound },
    ],
    primaryActions: [
      { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Assigned guest tasks and action items" },
      { label: "Documents", href: "/documents", icon: FileText, note: "Shared files and approved resources" },
      { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Invited meetings and notes" },
      { label: "Messenger", href: "/messenger", icon: FileText, note: "Coordinate inside approved rooms" },
    ],
    queue: [
      { title: "Review security audit checklist", meta: "Shared document", priority: "High" },
      { title: "Attend review meeting", meta: "This week", priority: "Medium" },
      { title: "Submit audit notes", meta: "Assigned task", priority: "Medium" },
    ],
    activity: [
      { title: "Document opened", detail: "Security review checklist", time: "Today", icon: FileText },
      { title: "Meeting invite received", detail: "Compliance review", time: "Yesterday", icon: CalendarDays },
      { title: "Task assigned", detail: "Audit notes requested", time: "2 days ago", icon: CheckSquare },
    ],
    insights: [
      "Guest access is limited to shared collaboration areas.",
      "Two assigned items should be completed before the review meeting.",
      "Use Messenger only for approved company rooms and threads.",
    ],
    focus: ["Guest access", "Shared documents", "Assigned tasks", "Meetings"],
  },
};

function isFrontlineRole(role?: AuthRole): role is FrontlineDashboardRole {
  return role === "Employee" || role === "HR" || role === "Finance" || role === "Sales" || role === "Support" || role === "Developer" || role === "Guest";
}

export function RoleDashboardPage() {
  const role = getStoredAuthSession()?.user.role;

  if (!isFrontlineRole(role)) {
    return <FullAccessDashboard />;
  }

  return <ProfessionalDashboard config={roleDashboards[role]} />;
}
