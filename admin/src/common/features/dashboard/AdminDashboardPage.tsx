import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  FolderKanban,
  LockKeyhole,
  MessageSquare,
  Monitor,
  Plug,
  Settings,
  ShieldCheck,
  UsersRound,
  Workflow,
} from "lucide-react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import type { AuthRole } from "@shared/auth/types";
import { ProfessionalDashboard, type ProfessionalDashboardConfig } from "@shared/platform/ProfessionalDashboard";

const adminNav = [
  {
    label: "Control",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
      { label: "Admin Panel", href: "/admin", icon: ShieldCheck },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Integrations", href: "/integrations", icon: Plug },
      { label: "Monitoring", href: "/monitoring", icon: Monitor },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "Meetings", href: "/meetings", icon: CalendarDays },
      { label: "Messenger", href: "/messenger", icon: MessageSquare },
      { label: "Employees", href: "/employees", icon: UsersRound },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

const managerNav = [
  {
    label: "Manager",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "Meetings", href: "/meetings", icon: CalendarDays },
      { label: "Messenger", href: "/messenger", icon: MessageSquare },
      { label: "Employees", href: "/employees", icon: UsersRound },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

const panelConfigs: Record<"Administrator" | "Manager", ProfessionalDashboardConfig> = {
  Administrator: {
    storageKey: "admin",
    eyebrow: "System Control",
    title: "Admin Dashboard",
    subtitle: "A polished command center for users, permissions, integrations, settings, audits, and operations.",
    roleLabel: "Administrator",
    navGroups: adminNav,
    stats: [
      { label: "Active Users", value: "248", trend: "6 roles", icon: UsersRound, href: "/admin" },
      { label: "Modules Online", value: "12", trend: "All healthy", icon: ShieldCheck, href: "/admin" },
      { label: "Integrations", value: "8", trend: "7 healthy", icon: Plug, href: "/integrations" },
      { label: "Policy Checks", value: "99%", trend: "MFA enforced", icon: LockKeyhole, href: "/settings" },
    ],
    primaryActions: [
      { label: "Admin Panel", href: "/admin", icon: ShieldCheck, note: "Users, roles, permissions, audits, and module control" },
      { label: "Settings", href: "/settings", icon: Settings, note: "Company, security, workspace, and system preferences" },
      { label: "Company Messenger", href: "/messenger", icon: MessageSquare, note: "Team chat, direct messages, room notes, and shared files" },
      { label: "Integrations", href: "/integrations", icon: Plug, note: "Connected apps, logs, sync status, and health" },
    ],
    queue: [
      { title: "Review manager role changes", meta: "2 permission updates", priority: "High" },
      { title: "Review integration settings", meta: "Admin controls", priority: "Medium" },
      { title: "Export weekly audit log", meta: "Security package", priority: "Medium" },
    ],
    activity: [
      { title: "Role policy updated", detail: "Manager access scope changed", time: "18 min ago", icon: ShieldCheck },
      { title: "Integration checked", detail: "QuickBooks sync health reviewed", time: "Today", icon: Plug },
      { title: "Backup completed", detail: "Admin backup package created", time: "Yesterday", icon: CheckCircle2 },
    ],
    insights: [
      "Two role changes should be reviewed before approving new manager access.",
      "Integration access has one key that should be rotated this week.",
      "Integration logs show one delayed QuickBooks sync job.",
    ],
    focus: ["Full admin access", "Role and permission control", "Integration settings", "System settings"],
  },
  Manager: {
    storageKey: "manager",
    eyebrow: "Manager Workspace",
    title: "Manager Dashboard",
    subtitle: "A professional execution dashboard for projects, workflows, tasks, meetings, employees, and analytics.",
    roleLabel: "Manager",
    navGroups: managerNav,
    stats: [
      { label: "Active Projects", value: "18", trend: "4 at risk", icon: FolderKanban, href: "/projects" },
      { label: "Open Tasks", value: "74", trend: "8 due today", icon: CheckSquare, href: "/tasks" },
      { label: "Team Members", value: "32", trend: "5 squads", icon: UsersRound, href: "/employees" },
      { label: "Workflow Runs", value: "126", trend: "+18%", icon: Workflow, href: "/workflows" },
    ],
    primaryActions: [
      { label: "Projects", href: "/projects", icon: FolderKanban, note: "Milestones, budgets, timelines, and details" },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Assignments, priorities, checklists, and delivery" },
      { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Reviews, action items, recordings, and summaries" },
      { label: "Company Messenger", href: "/messenger", icon: MessageSquare, note: "Coordinate with your team and share information" },
      { label: "Analytics", href: "/analytics", icon: BarChart3, note: "Delivery performance, workload, and risk trends" },
    ],
    queue: [
      { title: "Review Finance Automation risk", meta: "Budget review", priority: "High" },
      { title: "Close sprint planning actions", meta: "3 high priority tasks", priority: "High" },
      { title: "Prepare weekly operating summary", meta: "Analytics workspace", priority: "Medium" },
    ],
    activity: [
      { title: "Project updated", detail: "Finance Automation moved to review", time: "22 min ago", icon: FolderKanban },
      { title: "Task completed", detail: "Dashboard QA pass finished", time: "Today", icon: CheckCircle2 },
      { title: "Meeting notes updated", detail: "Decisions and action items reviewed", time: "Yesterday", icon: CalendarDays },
    ],
    insights: [
      "Finance Automation has one dependency that can delay the review.",
      "Three high-priority tasks are due today across your team.",
      "Analytics can support the weekly status pack from current project data.",
    ],
    focus: ["Limited manager access", "Projects and tasks", "Meetings and workflows", "Analytics"],
  },
};

function getPanelRole(role?: AuthRole): keyof typeof panelConfigs {
  return role === "Manager" ? "Manager" : "Administrator";
}

export function AdminDashboardPage() {
  const role = getPanelRole(getStoredAuthSession()?.user.role);
  return <ProfessionalDashboard config={panelConfigs[role]} />;
}
