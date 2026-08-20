import {
 BriefcaseBusiness,
 CalendarDays,
 CheckCircle2,
 CheckSquare,
 ContactRound,
 FileText,
 ShieldCheck,
 Package,
 UserRound,
 UsersRound,
 WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { authSessionChangedEvent, getStoredAuthSession } from "@shared/auth/auth-service";
import type { AuthRole, JwtReadySession } from "@shared/auth/types";
import {
 fetchLeadStats,
 fetchOrgCounts,
 fetchRecentTasks,
} from "@shared/dashboard-stats/dashboard-stats.api";
import { fetchTeamAccounts } from "@shared/team-accounts/team-accounts.api";
import { fetchTaskStats } from "@shared/tasks/tasks.api";
import {
 ProfessionalDashboard,
 type ProfessionalDashboardActivity,
 type ProfessionalDashboardConfig,
} from "@shared/platform/ProfessionalDashboard";
import { liveSyncIntervalMs, sharedDataChangedEvent } from "@shared/realtime/data-sync";
import { DashboardPage as FullAccessDashboard } from "./DashboardPage";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";

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
 stats: [{ label: "Open Tasks", value: "—", trend: "Loading…", icon: CheckSquare, href: "/tasks" }],
 primaryActions: [
 { label: "My Tasks", href: "/tasks", icon: CheckSquare, note: "Assignments, priorities, and completion tracking" },
 { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Daily schedule, recordings, and action items" },
 { label: "Documents", href: "/documents", icon: FileText, note: "Shared files, reports, and personal uploads" },
 { label: "Messenger", href: "/messenger", icon: FileText, note: "Coordinate with your team and share updates" },
 ],
 queue: [],
 activity: [],
 insights: [],
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
 { label: "Employees", value: "—", trend: "Loading…", icon: UsersRound, href: "/employees" },
 { label: "Open HR Tasks", value: "—", trend: "Loading…", icon: CheckSquare, href: "/tasks" },
 { label: "Policy Docs", value: "—", trend: "Loading…", icon: FileText, href: "/documents" },
 ],
 primaryActions: [
 { label: "Employees", href: "/employees", icon: UsersRound, note: "Employee records, departments, and onboarding" },
 { label: "HR Tasks", href: "/tasks", icon: CheckSquare, note: "Approvals, documents, and people operations" },
 { label: "Documents", href: "/documents", icon: FileText, note: "Policies, contracts, and HR files" },
 { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Interviews, check-ins, and reviews" },
 ],
 queue: [],
 activity: [],
 insights: [],
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
 stats: [{ label: "Open Tasks", value: "—", trend: "Loading…", icon: CheckSquare, href: "/tasks" }],
 primaryActions: [
 { label: "Finance", href: "/finance", icon: WalletCards, note: "Invoices, payments, budgets, and collections" },
 { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Approvals, reminders, and finance follow-ups" },
 { label: "Documents", href: "/documents", icon: FileText, note: "Invoices, reports, policies, and shared files" },
 { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Reviews, vendor calls, and internal syncs" },
 ],
 queue: [],
 activity: [],
 insights: [],
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
 { label: "Pipeline", value: "—", trend: "Loading…", icon: WalletCards, href: "/crm" },
 { label: "Active Leads", value: "—", trend: "Loading…", icon: ContactRound, href: "/crm" },
 { label: "Win Rate", value: "—", trend: "Loading…", icon: ContactRound },
 ],
 primaryActions: [
 { label: "CRM", href: "/crm", icon: ContactRound, note: "Leads, customers, deals, and follow-ups" },
 { label: "Finance", href: "/finance", icon: WalletCards, note: "Invoices, revenue, payments, and collections" },
 { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Sales tasks and customer reminders" },
 ],
 queue: [],
 activity: [],
 insights: [],
 focus: ["CRM pipeline", "Sales finance", "Products", "Revenue tasks"],
 },
 Support: {
 storageKey: "support",
 eyebrow: "Customer Support",
 title: "Support Dashboard",
 subtitle: "A focused workspace for support tasks, knowledge, customer notes, meetings, and collaboration.",
 roleLabel: "Support",
 navGroups: supportNav,
 stats: [],
 primaryActions: [
 { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Support queues, escalations, and follow-ups" },
 { label: "Documents", href: "/documents", icon: FileText, note: "Search support articles and product docs" },
 { label: "Messenger", href: "/messenger", icon: FileText, note: "Coordinate escalations with the team" },
 ],
 queue: [],
 activity: [],
 insights: [],
 focus: ["Support access", "Tasks", "Documents", "Messenger"],
 },
 Developer: {
 storageKey: "developer",
 eyebrow: "Developer Workspace",
 title: "Developer Dashboard",
 subtitle: "A focused engineering view for delivery tasks, docs, meetings, and technical context.",
 roleLabel: "Developer",
 navGroups: commonNav,
 stats: [{ label: "Dev Tasks", value: "—", trend: "Loading…", icon: CheckSquare, href: "/tasks" }],
 primaryActions: [
 { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Assigned engineering work and reviews" },
 { label: "Documents", href: "/documents", icon: FileText, note: "Specs, architecture notes, and runbooks" },
 { label: "Messenger", href: "/messenger", icon: FileText, note: "Ask teammates for summaries and implementation help" },
 ],
 queue: [],
 activity: [],
 insights: [],
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
 { label: "Assigned Tasks", value: "—", trend: "Loading…", icon: CheckSquare, href: "/tasks" },
 { label: "Access Scope", value: "Limited", trend: "Guest", icon: UserRound },
 ],
 primaryActions: [
 { label: "Tasks", href: "/tasks", icon: CheckSquare, note: "Assigned guest tasks and action items" },
 { label: "Documents", href: "/documents", icon: FileText, note: "Shared files and approved resources" },
 { label: "Meetings", href: "/meetings", icon: CalendarDays, note: "Invited meetings and notes" },
 { label: "Messenger", href: "/messenger", icon: FileText, note: "Coordinate inside approved rooms" },
 ],
 queue: [],
 activity: [],
 insights: [],
 focus: ["Guest access", "Shared documents", "Assigned tasks", "Meetings"],
 },
};

function isFrontlineRole(role?: AuthRole): role is FrontlineDashboardRole {
 return role === "Employee" || role === "HR" || role === "Finance" || role === "Sales" || role === "Support" || role === "Developer" || role === "Guest";
}

function SetupStatus({ complete }: { complete: boolean }) {
 return (
 <span className={["rounded-md px-2.5 py-1 text-xs font-semibold", complete ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"].join(" ")}>
 {complete ? "Done" : "Needed"}
 </span>
 );
}

function OnboardingSetupCard({ session }: { session: JwtReadySession | null }) {
 const needsProfile = session?.user.isProfileComplete === false;
 const needsFace = session?.user.hasActiveFaceEnrollment === false;

 if (!needsProfile && !needsFace) {
 return null;
 }

 return (
 <Card className="rounded-lg border-primary/25 bg-card shadow-sm">
 <CardContent className="p-5">
 <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
 <div className="min-w-0">
 <p className="text-sm font-semibold text-primary">Account setup</p>
 <h2 className="mt-2 text-xl font-bold tracking-normal">Finish your employee setup</h2>
 <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
 Complete your profile details and face setup to unlock attendance-ready account verification.
 </p>
 <div className="mt-4 grid gap-3 sm:grid-cols-2">
 <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
 <span className="flex min-w-0 items-center gap-3">
 <UserRound className="h-4 w-4 shrink-0 text-primary" />
 <span className="truncate text-sm font-semibold">Profile details</span>
 </span>
 <SetupStatus complete={!needsProfile} />
 </div>
 <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
 <span className="flex min-w-0 items-center gap-3">
 <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
 <span className="truncate text-sm font-semibold">Face setup</span>
 </span>
 <SetupStatus complete={!needsFace} />
 </div>
 </div>
 </div>
 <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
 {needsProfile ? (
 <Button asChild type="button">
 <Link to="/complete-profile">
 <UserRound className="h-4 w-4" />
 Complete Profile
 </Link>
 </Button>
 ) : (
 <Button disabled type="button" variant="outline">
 <UserRound className="h-4 w-4" />
 Complete Profile
 </Button>
 )}
 {needsFace ? (
 <Button asChild type="button">
 <Link to="/face-enrollment">
 <ShieldCheck className="h-4 w-4" />
 Set Up Face
 </Link>
 </Button>
 ) : (
 <Button disabled type="button" variant="outline">
 <ShieldCheck className="h-4 w-4" />
 Set Up Face
 </Button>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 );
}

export function RoleDashboardPage() {
 const [session, setSession] = useState<JwtReadySession | null>(() => getStoredAuthSession());
 const role = session?.user.role;
 const [liveStats, setLiveStats] = useState<Record<string, { value: string; trend: string }>>({});
 const [liveActivity, setLiveActivity] = useState<ProfessionalDashboardActivity[]>([]);
 const loadSequenceRef = useRef(0);

 const loadDashboard = useCallback(async () => {
 if (!isFrontlineRole(role)) return;
 const requestId = loadSequenceRef.current + 1;
 loadSequenceRef.current = requestId;
 const next: Record<string, { value: string; trend: string }> = {};
 const activity: ProfessionalDashboardActivity[] = [];

 const [taskStats, recentTasks] = await Promise.all([fetchTaskStats(), fetchRecentTasks(3)]);
 if (requestId !== loadSequenceRef.current) return;

 if (taskStats.status === "ok") {
 const openTasks = taskStats.data.total - (taskStats.data.byStatus.find((entry) => entry.status === "Completed")?.count ?? 0);
 const trend = `${taskStats.data.overdue} overdue`;
 next["Open Tasks"] = { value: String(openTasks), trend };
 next["Dev Tasks"] = { value: String(openTasks), trend };
 next["Assigned Tasks"] = { value: String(openTasks), trend };
 }
 if (recentTasks.status === "ok") {
 recentTasks.data.forEach((task) =>
 activity.push({
 title: "Task updated",
 detail: `${task.title} — ${task.status}`,
 time: new Date(task.updatedAt).toLocaleDateString(),
 icon: CheckCircle2,
 }),
 );
 }

 if (role === "HR") {
 const [accountsResult, orgCounts] = await Promise.all([fetchTeamAccounts(), fetchOrgCounts()]);
 if (requestId !== loadSequenceRef.current) return;
 if (accountsResult.status === "ok") {
 next.Employees = { value: String(accountsResult.data.length), trend: "Live count" };
 }
 if (orgCounts.status === "ok") {
 next["Policy Docs"] = { value: String(orgCounts.data.policies), trend: "Live count" };
 }
 }

 if (role === "Sales") {
 const leadStats = await fetchLeadStats();
 if (requestId !== loadSequenceRef.current) return;
 if (leadStats.status === "ok") {
 const winRate = leadStats.data.totalValue > 0 ? Math.round((leadStats.data.wonValue / leadStats.data.totalValue) * 100) : 0;
 next.Pipeline = { value: `$${Math.round(leadStats.data.totalValue / 1000)}K`, trend: "Live total" };
 next["Active Leads"] = { value: String(leadStats.data.total), trend: "Live count" };
 next["Win Rate"] = { value: `${winRate}%`, trend: "Won / total value" };
 }
 }

 setLiveStats(next);
 setLiveActivity(activity);
 }, [role]);

 useEffect(() => {
 if (!isFrontlineRole(role)) return;
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
 }, [loadDashboard, role]);

 useEffect(() => {
 const syncSession = () => setSession(getStoredAuthSession());
 window.addEventListener(authSessionChangedEvent, syncSession);
 window.addEventListener("storage", syncSession);
 return () => {
 window.removeEventListener(authSessionChangedEvent, syncSession);
 window.removeEventListener("storage", syncSession);
 };
 }, []);

 if (!isFrontlineRole(role)) {
 return <FullAccessDashboard />;
 }

 const config = roleDashboards[role];
 const stats = config.stats.map((stat) => (liveStats[stat.label] ? { ...stat, ...liveStats[stat.label] } : stat));

 return (
 <ProfessionalDashboard
 config={{ ...config, stats, activity: liveActivity.length > 0 ? liveActivity : config.activity }}
 leadingContent={<OnboardingSetupCard session={session} />}
 />
 );
}
