import {
 BarChart3,
 CalendarDays,
 CheckSquare,
 FolderKanban,
 MessageSquare,
 Monitor,
 Plug,
 Settings,
 ShieldCheck,
 UsersRound,
 Workflow,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import type { AuthRole } from "@shared/auth/types";
import {
 fetchProjectStats,
 fetchWorkflowStats,
} from "@shared/dashboard-stats/dashboard-stats.api";
import { fetchIntegrations } from "@shared/integrations/integration.api";
import {
 ProfessionalDashboard,
 type ProfessionalDashboardConfig,
} from "@shared/platform/ProfessionalDashboard";
import { liveSyncIntervalMs, sharedDataChangedEvent } from "@shared/realtime/data-sync";
import { fetchTeamAccounts } from "@shared/team-accounts/team-accounts.api";
import { fetchTaskStats } from "@shared/tasks/tasks.api";
import { useAdministratorMonitoringAccess } from "@/admin/features/administrator-access/AdministratorMonitoringAccessContext";

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
 { label: "Active Users", value: "—", trend: "Loading…", icon: UsersRound, href: "/admin" },
 { label: "Integrations", value: "—", trend: "Loading…", icon: Plug, href: "/integrations" },
 ],
 primaryActions: [
 { label: "Admin Panel", href: "/admin", icon: ShieldCheck, note: "Users, roles, permissions, audits, and module control" },
 { label: "Settings", href: "/settings", icon: Settings, note: "Company, security, workspace, and system preferences" },
 { label: "Company Messenger", href: "/messenger", icon: MessageSquare, note: "Team chat, direct messages, room notes, and shared files" },
 { label: "Integrations", href: "/integrations", icon: Plug, note: "Connected apps, logs, sync status, and health" },
 ],
 queue: [],
 activity: [
 { title: "Project Created", detail: "Sales workspace was created", time: "2 min ago", icon: FolderKanban },
 { title: "Task Completed", detail: "Dashboard QA checklist was finished", time: "18 min ago", icon: CheckSquare },
 { title: "Employee Added", detail: "New HR profile added to onboarding", time: "42 min ago", icon: UsersRound },
 { title: "Integration Checked", detail: "Workspace integrations health was reviewed", time: "1 hr ago", icon: Plug },
 { title: "Meeting Scheduled", detail: "Finance Automation Demo scheduled", time: "Today", icon: CalendarDays },
 ],
 insights: [],
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
 { label: "Active Projects", value: "—", trend: "Loading…", icon: FolderKanban, href: "/projects" },
 { label: "Open Tasks", value: "—", trend: "Loading…", icon: CheckSquare, href: "/tasks" },
 { label: "Team Members", value: "—", trend: "Loading…", icon: UsersRound, href: "/employees" },
 { label: "Workflow Runs", value: "—", trend: "Loading…", icon: Workflow, href: "/workflows" },
 ],
 primaryActions: [
 { label: "Projects", href: "/projects", icon: FolderKanban, note: "Milestones, budgets, timelines, and details" },
 { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Assignments, priorities, checklists, and delivery" },
 { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Reviews, action items, recordings, and summaries" },
 { label: "Company Messenger", href: "/messenger", icon: MessageSquare, note: "Coordinate with your team and share information" },
 { label: "Analytics", href: "/analytics", icon: BarChart3, note: "Delivery performance, workload, and risk trends" },
 ],
 queue: [],
 activity: [
 { title: "Project Created", detail: "Sales workspace was created", time: "2 min ago", icon: FolderKanban },
 { title: "Task Completed", detail: "Dashboard QA checklist was finished", time: "18 min ago", icon: CheckSquare },
 { title: "Employee Added", detail: "New HR profile added to onboarding", time: "42 min ago", icon: UsersRound },
 { title: "Workflow Reviewed", detail: "Operations workflow status was checked", time: "1 hr ago", icon: Workflow },
 { title: "Meeting Scheduled", detail: "Finance Automation Demo scheduled", time: "Today", icon: CalendarDays },
 ],
 insights: [],
 focus: ["Limited manager access", "Projects and tasks", "Meetings and workflows", "Analytics"],
 },
};

function getPanelRole(role?: AuthRole): keyof typeof panelConfigs {
 return role === "Manager" ? "Manager" : "Administrator";
}

export function AdminDashboardPage() {
 const { hasPermission } = useAdministratorMonitoringAccess();
 const role = getPanelRole(getStoredAuthSession()?.user.role);
 const [liveStats, setLiveStats] = useState<Record<string, { value: string; trend: string }>>({});
 const loadSequenceRef = useRef(0);

 const loadDashboard = useCallback(async () => {
 const requestId = loadSequenceRef.current + 1;
 loadSequenceRef.current = requestId;

 async function loadAdministrator() {
 const [accountsResult, integrationsResult] = await Promise.all([
 fetchTeamAccounts(),
 (async () => {
 const session = getStoredAuthSession();
 try {
 return await fetchIntegrations(session?.accessToken);
 } catch {
 return null;
 }
 })(),
 ]);
 if (requestId !== loadSequenceRef.current) return;

 const next: Record<string, { value: string; trend: string }> = {};
 if (accountsResult.status === "ok") {
 const activeCount = accountsResult.data.filter((account) => account.isActive).length;
 next["Active Users"] = { value: String(activeCount), trend: "Live count" };
 }
 if (integrationsResult) {
 const connected = integrationsResult.filter((integration) => integration.status === "connected").length;
 next.Integrations = { value: String(integrationsResult.length), trend: `${connected} connected` };
 }
 setLiveStats(next);
 }

 async function loadManager() {
 const [projectStats, taskStats, accountsResult, workflowStats] = await Promise.all([
 fetchProjectStats(),
 fetchTaskStats(),
 fetchTeamAccounts(),
 fetchWorkflowStats(),
 ]);
 if (requestId !== loadSequenceRef.current) return;

 const next: Record<string, { value: string; trend: string }> = {};
 if (projectStats.status === "ok") {
 next["Active Projects"] = { value: String(projectStats.data.active), trend: `${projectStats.data.delayed} delayed` };
 }
 if (taskStats.status === "ok") {
 const openTasks = taskStats.data.total - (taskStats.data.byStatus.find((entry) => entry.status === "Completed")?.count ?? 0);
 next["Open Tasks"] = { value: String(openTasks), trend: `${taskStats.data.overdue} overdue` };
 }
 if (accountsResult.status === "ok") {
 next["Team Members"] = { value: String(accountsResult.data.length), trend: "Live count" };
 }
 if (workflowStats.status === "ok") {
 next["Workflow Runs"] = { value: String(workflowStats.data.totalExecutions), trend: `${workflowStats.data.active} active` };
 }
 setLiveStats(next);

 }

 if (role === "Administrator") {
 void loadAdministrator();
 } else {
 void loadManager();
 }
 }, [role]);

 useEffect(() => {
 let active = true;
 const refreshIfActive = () => {
 if (!active) return;
 void loadDashboard();
 };

 void loadDashboard();
 const intervalId = window.setInterval(refreshIfActive, liveSyncIntervalMs);
 window.addEventListener("focus", refreshIfActive);
 window.addEventListener(sharedDataChangedEvent, refreshIfActive);
 document.addEventListener("visibilitychange", refreshIfActive);
 return () => {
 active = false;
 loadSequenceRef.current += 1;
 window.clearInterval(intervalId);
 window.removeEventListener("focus", refreshIfActive);
 window.removeEventListener(sharedDataChangedEvent, refreshIfActive);
 document.removeEventListener("visibilitychange", refreshIfActive);
 };
 }, [loadDashboard]);

 const baseConfig = panelConfigs[role];
 const config = hasPermission("device.monitoring.view")
 ? baseConfig
 : {
 ...baseConfig,
 navGroups: baseConfig.navGroups.map((group) => ({
 ...group,
 items: group.items.filter((item) => item.href !== "/monitoring"),
 })),
 };
 const stats = config.stats.map((stat) => (liveStats[stat.label] ? { ...stat, ...liveStats[stat.label] } : stat));

 return <ProfessionalDashboard config={{ ...config, stats }} />;
}
