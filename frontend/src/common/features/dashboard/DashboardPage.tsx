import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
 Bell,
 CalendarCheck,
 CheckCircle2,
 ChevronLeft,
 ChevronRight,
 CheckSquare,
 FolderKanban,
 GripVertical,
 Menu,
 MessageSquareText,
 MoreHorizontal,
 Settings2,
 UserPlus,
 X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EmptyState } from "@shared/ui/empty-state";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { SkeletonCard } from "@shared/ui/skeleton";
import { AttendanceDrawer } from "@shared/attendance";
import { useIsTablet, useMediaQuery } from "@shared/hooks/useMediaQuery";
import { aiAssistantOpenEvent, dashboardExportRequestEvent } from "@shared/platform/events";
import { cn } from "@shared/lib/utils";
import { formatDateTime } from "@shared/lib/utils-helpers";
import { clearAuthSession, getStoredAuthSession } from "@shared/auth/auth-service";
import { useToast } from "@shared/ui/toast-context";
import { liveSyncIntervalMs, sharedDataChangedEvent } from "@shared/realtime/data-sync";
import { fetchProjectStats, fetchRecentProjects, fetchRecentTasks, type RecentProject, type RecentTask } from "@shared/dashboard-stats/dashboard-stats.api";
import { fetchTeamAccounts } from "@shared/team-accounts/team-accounts.api";
import { fetchNotifications } from "@shared/notifications/notification.api";
import type { Notification } from "@shared/notifications/notification.schema";
import {
 dashboardLogoutItem,
 dashboardNavGroups,
 initialWidgets,
 projectTemplates,
 quickActions,
 type DashboardWidget,
 type DashboardWidgetId,
 type SmartKpi,
} from "./dashboard.data";

const dashboardLayoutStorageKey = "ai-bos-dashboard-layout";

function getSavedWidgets() {
 try {
 const saved = window.localStorage.getItem(dashboardLayoutStorageKey);
 if (!saved) return initialWidgets;
 const parsed = JSON.parse(saved) as DashboardWidget[];
 const knownIds = new Set(initialWidgets.map((widget) => widget.id));
 const restored = parsed.filter((widget) => knownIds.has(widget.id));
 const missing = initialWidgets.filter((widget) => !restored.some((item) => item.id === widget.id));
 return [...restored, ...missing];
 } catch {
 return initialWidgets;
 }
}

function Sidebar({
 collapsed,
 mobileOpen,
 onCloseMobile,
 onOpenAttendance,
 onLogout,
 onToggle,
}: {
 collapsed: boolean;
 mobileOpen: boolean;
 onCloseMobile: () => void;
 onOpenAttendance: () => void;
 onLogout: () => void;
 onToggle: () => void;
}) {
 const LogoutIcon = dashboardLogoutItem.icon;
 const location = useLocation();
 const isTablet = useIsTablet();
 // Tablet (768–1023px) gets a persistent icon-rail, not the phone's off-canvas drawer.
 const effectiveCollapsed = collapsed || isTablet;

 return (
 <>
 <div
 className={cn(
 "fixed inset-x-0 bottom-0 top-14 z-40 bg-foreground transition-opacity md:hidden",
 mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
 )}
 onClick={onCloseMobile}
 />
 <aside
 className={cn(
 "fixed bottom-0 left-0 top-14 z-50 flex border-r bg-background transition-all duration-300 md:sticky md:top-0 md:z-auto md:h-screen",
 effectiveCollapsed ? "w-[88px]" : "w-[292px]",
 mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
 )}
 >
 <div className="flex min-w-0 flex-1 flex-col p-4">
 <div className="flex h-12 items-center justify-between gap-2">
 {!effectiveCollapsed && (
 <Link className="min-w-0" to="/">
 <span className="block truncate text-base font-bold">Nexora Softworks</span>
 <span className="block truncate text-xs text-muted-foreground">Operating System</span>
 </Link>
 )}
 <Button aria-label="Close sidebar" className="md:hidden" onClick={onCloseMobile} size="icon" type="button" variant="ghost">
 <X className="h-4 w-4" />
 </Button>
 </div>

 <nav className="mt-7 flex-1 space-y-6 overflow-y-auto pr-1">
 {dashboardNavGroups.map((group) => (
 <div key={group.label}>
 {!effectiveCollapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{group.label}</p>}
 <div className="space-y-1">
 {group.items.map((item) => {
 const Icon = item.icon;
 const isActive = item.href ? location.pathname === item.href : false;
 const itemClassName = cn(
 "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all hover:bg-muted hover:text-foreground",
 isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15" : "text-muted-foreground",
 effectiveCollapsed && "justify-center px-0",
 );
 const content = (
 <>
 <Icon className="h-4 w-4 shrink-0" />
 {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
 {!effectiveCollapsed && item.comingSoon && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">soon</span>}
 </>
 );
 return item.href ? (
 <Link className={itemClassName} key={item.label} title={effectiveCollapsed ? item.label : undefined} to={item.href}>
 {content}
 </Link>
 ) : (
 <button className={itemClassName} key={item.label} title={effectiveCollapsed ? item.label : undefined} type="button">
 {content}
 </button>
 );
 })}
 </div>
 </div>
 ))}
 </nav>

 <div className="space-y-2 border-t pt-4">
 <button
 aria-label={effectiveCollapsed ? "AI Analyzer" : undefined}
 className={cn(
 "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-primary transition-all hover:bg-primary/10",
 effectiveCollapsed && "justify-center px-0",
 )}
 onClick={() => window.dispatchEvent(new Event(aiAssistantOpenEvent))}
 title={effectiveCollapsed ? "AI Analyzer" : undefined}
 type="button"
 >
 <MessageSquareText className="h-4 w-4 shrink-0" />
 {!effectiveCollapsed && <span className="truncate">AI Analyzer</span>}
 </button>
 <button
 aria-label={effectiveCollapsed ? "Attendance" : undefined}
 className={cn(
 "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
 effectiveCollapsed && "justify-center px-0",
 )}
 onClick={() => {
 onOpenAttendance();
 onCloseMobile();
 }}
 title={effectiveCollapsed ? "Attendance" : undefined}
 type="button"
 >
 <CalendarCheck className="h-4 w-4 shrink-0" />
 {!effectiveCollapsed && <span className="truncate">Attendance</span>}
 </button>
 <button
 className={cn(
 "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive",
 effectiveCollapsed && "justify-center px-0",
 )}
 onClick={onLogout}
 title={effectiveCollapsed ? dashboardLogoutItem.label : undefined}
 type="button"
 >
 <LogoutIcon className="h-4 w-4 shrink-0" />
 {!effectiveCollapsed && <span>{dashboardLogoutItem.label}</span>}
 </button>
 <Button aria-label="Collapse sidebar" className="hidden w-full rounded-xl lg:flex" onClick={onToggle} type="button" variant="outline">
 {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
 {!collapsed && "Collapse"}
 </Button>
 </div>
 </div>
 </aside>
 </>
 );
}

// Search, Quick Add, notifications, theme, and profile all now live in the app-wide
// GlobalTopBar (see platform/AppShell.tsx) so they aren't duplicated here. This just
// keeps the mobile sidebar toggle, since the docked sidebar is off-canvas on small
// screens and needs a way to be opened.
function MobileSidebarToggle({ onOpenSidebar }: { onOpenSidebar: () => void }) {
 return (
 <div className="flex items-center gap-3 border-b bg-background px-4 py-2 md:hidden">
 <Button aria-label="Open sidebar" onClick={onOpenSidebar} size="icon" type="button" variant="ghost">
 <Menu className="h-5 w-5" />
 </Button>
 <span className="text-sm font-semibold text-muted-foreground">Menu</span>
 </div>
 );
}

function SmartCard({ children, className, icon: Icon, title }: { children: ReactNode; className?: string; icon?: LucideIcon; title: string }) {
 return (
 <Card className={cn("glass h-full rounded-2xl", className)}>
 <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
 <CardTitle className="text-base">{title}</CardTitle>
 {Icon ? <Icon className="h-4 w-4 text-primary" /> : <MoreHorizontal className="h-4 w-4 text-muted-foreground" />}
 </CardHeader>
 <CardContent>{children}</CardContent>
 </Card>
 );
}

type WidgetData = {
 smartKpis: SmartKpi[];
 recentTasks: RecentTask[];
 recentProjects: RecentProject[];
 notifications: Notification[];
 lastSyncedAt?: string;
};

function DashboardWidgetContent({ id, data }: { id: DashboardWidgetId; data: WidgetData }) {
 if (id === "overview") {
 return (
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
 {data.smartKpis.map((item, index) => {
 const Icon = item.icon;
 return (
 <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={item.label} transition={{ delay: index * 0.04 }}>
 <Link to={item.href}>
 <Card className="h-full rounded-2xl bg-card hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
 <CardContent className="p-5">
 <Icon className="mb-5 h-5 w-5 text-primary" />
 <p className="text-sm text-muted-foreground">{item.label}</p>
 <p className="mt-2 text-3xl font-bold">{item.value}</p>
 <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{item.change}</p>
 </CardContent>
 </Card>
 </Link>
 </motion.div>
 );
 })}
 </div>
 );
 }

 if (id === "tasks") {
 return (
 <SmartCard icon={CheckSquare} title="Pending Tasks">
 <div className="space-y-3">
 {data.recentTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
 {data.recentTasks.map((task) => (
 <Link
 className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4 transition-colors hover:bg-muted"
 key={task.id}
 to="/tasks"
 >
 <span className="min-w-0 flex-1">
 <span className="block text-sm font-semibold">{task.title}</span>
 <span className="mt-1 block text-xs text-muted-foreground">
 {task.status}
 {task.dueDate ? ` - Due ${new Date(task.dueDate).toLocaleDateString()}` : ""}
 </span>
 </span>
 </Link>
 ))}
 </div>
 </SmartCard>
 );
 }

 if (id === "projects") {
 return (
 <SmartCard icon={FolderKanban} title="Recent Projects">
 <div className="grid gap-3 lg:grid-cols-3">
 {data.recentProjects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
 {data.recentProjects.map((project) => (
 <Link className="rounded-2xl border bg-background p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass" key={project.id} to={`/projects/${project.id}`}>
 <div className="flex items-start justify-between gap-3">
 <p className="font-semibold leading-6">{project.projectName}</p>
 <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{project.status}</span>
 </div>
 <p className="mt-4 text-xs text-muted-foreground">Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
 </Link>
 ))}
 </div>
 </SmartCard>
 );
 }

 return (
 <SmartCard icon={Bell} title="Notifications">
 <div className="space-y-3">
 {data.notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
 {data.notifications.map((item) => (
 <div className="rounded-2xl border bg-background p-4" key={item._id}>
 <div className="flex items-start justify-between gap-3">
 <p className="text-sm font-semibold leading-6">{item.title}</p>
 {!item.isRead && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
 </div>
 <p className="mt-1 text-xs text-muted-foreground">
 {item.category} - {item.priority}
 </p>
 </div>
 ))}
 </div>
 </SmartCard>
 );
}

const emptyWidgetData: WidgetData = { smartKpis: [], recentTasks: [], recentProjects: [], notifications: [] };

function DashboardContent({ userLabel }: { userLabel: string }) {
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 const [widgets, setWidgets] = useState<DashboardWidget[]>(getSavedWidgets);
 const [draggingId, setDraggingId] = useState<DashboardWidgetId | null>(null);
 const [widgetData, setWidgetData] = useState<WidgetData>(emptyWidgetData);
 const loadSequenceRef = useRef(0);
 const { toast } = useToast();

 const loadDashboard = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
 const requestId = loadSequenceRef.current + 1;
 loadSequenceRef.current = requestId;
 if (silent) {
 setRefreshing(true);
 } else {
 setLoading(true);
 }
 const session = getStoredAuthSession();
 const [projectStats, accountsResult, recentProjectsResult, recentTasksResult, notificationsResult] = await Promise.all([
 fetchProjectStats(),
 fetchTeamAccounts(),
 fetchRecentProjects(3),
 fetchRecentTasks(4),
 fetchNotifications(session?.accessToken).catch(() => null),
 ]);
 if (requestId !== loadSequenceRef.current) return;

 const smartKpis: SmartKpi[] = [];
 if (projectStats.status === "ok") {
 smartKpis.push({
 label: "Projects",
 value: String(projectStats.data.total),
 change: `${projectStats.data.active} active`,
 icon: FolderKanban,
 href: "/projects",
 });
 }
 if (accountsResult.status === "ok") {
 smartKpis.push({
 label: "Employees",
 value: String(accountsResult.data.length),
 change: "Live count",
 icon: UserPlus,
 href: "/employees",
 });
 }

 setWidgetData({
 smartKpis,
 recentTasks: recentTasksResult.status === "ok" ? recentTasksResult.data : [],
 recentProjects: recentProjectsResult.status === "ok" ? recentProjectsResult.data : [],
 notifications: notificationsResult ?? [],
 lastSyncedAt: new Date().toISOString(),
 });
 setLoading(false);
 setRefreshing(false);
 }, []);

 useEffect(() => {
 let active = true;
 const refreshIfActive = () => {
 if (!active) return;
 void loadDashboard({ silent: true });
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

 useEffect(() => {
 window.localStorage.setItem(dashboardLayoutStorageKey, JSON.stringify(widgets));
 }, [widgets]);

 const visibleWidgets = widgets.filter((widget) => widget.visible);

 const exportDashboard = () => {
 const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), userLabel, widgets }, null, 2)], {
 type: "application/json",
 });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = "dashboard-export.json";
 link.click();
 URL.revokeObjectURL(url);
 toast({ title: "Dashboard exported", description: "Dashboard snapshot downloaded.", type: "success" });
 };

 useEffect(() => {
 window.addEventListener(dashboardExportRequestEvent, exportDashboard);
 return () => window.removeEventListener(dashboardExportRequestEvent, exportDashboard);
 });

 const moveWidget = (targetId: DashboardWidgetId) => {
 if (!draggingId || draggingId === targetId) return;
 setWidgets((current) => {
 const dragging = current.find((widget) => widget.id === draggingId);
 if (!dragging) return current;
 const withoutDragging = current.filter((widget) => widget.id !== draggingId);
 const targetIndex = withoutDragging.findIndex((widget) => widget.id === targetId);
 return [...withoutDragging.slice(0, targetIndex), dragging, ...withoutDragging.slice(targetIndex)];
 });
 };

 return (
 <main className="min-w-0 flex-1">
 <div className="space-y-6 p-4 lg:p-6">
 <motion.div animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end" initial={{ opacity: 0, y: 18 }} transition={{ duration: 0.45 }}>
 <div>
 <p className="text-sm font-semibold text-primary">Good Morning, {userLabel}</p>
 <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight lg:text-5xl">Run your business from one calm command center.</h1>
 <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
 A modular operating dashboard for projects, tasks, people, and daily work.
 </p>
 </div>
 <div className="glass-soft rounded-2xl p-4">
 <p className="text-sm font-semibold">Custom Dashboard</p>
 <div className="mt-2 flex flex-wrap items-center gap-2">
 <Button disabled={refreshing} onClick={() => void loadDashboard({ silent: true })} size="sm" type="button" variant="outline">
 {refreshing ? "Syncing..." : "Sync"}
 </Button>
 <p className="text-xs text-muted-foreground">Live sync every 10s.</p>
 </div>
 </div>
 </motion.div>

 {loading ? (
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
 {Array.from({ length: 4 }).map((_, index) => (
 <SkeletonCard key={index} />
 ))}
 </div>
 ) : (
 <>
 <DashboardWidgetContent data={widgetData} id="overview" />

 <Card className="glass rounded-2xl">
 <CardHeader>
 <CardTitle>Widget Controls</CardTitle>
 <p className="text-sm text-muted-foreground">Hide, show, and rearrange dashboard widgets.</p>
 </CardHeader>
 <CardContent className="flex flex-wrap gap-2">
 {widgets.map((widget) => (
 <button
 className={cn(
 "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
 widget.visible ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
 )}
 key={widget.id}
 onClick={() => setWidgets((current) => current.map((item) => (item.id === widget.id ? { ...item, visible: !item.visible } : item)))}
 type="button"
 >
 {widget.title}
 </button>
 ))}
 </CardContent>
 </Card>

 <div className="grid gap-4 xl:grid-cols-2">
 {visibleWidgets.filter((widget) => widget.id !== "overview").length === 0 ? (
 <div className="xl:col-span-2">
 <EmptyState
 action={{ label: "Restore Widgets", onClick: () => setWidgets(initialWidgets) }}
 description="Your dashboard can stay minimal, or you can bring back tasks, projects, and notifications."
 icon={Settings2}
 title="No widgets visible"
 />
 </div>
 ) : (
 visibleWidgets
 .filter((widget) => widget.id !== "overview")
 .map((widget) => (
 <div
 draggable
 key={widget.id}
 onDragEnd={() => setDraggingId(null)}
 onDragOver={(event) => event.preventDefault()}
 onDragStart={() => setDraggingId(widget.id)}
 onDrop={() => moveWidget(widget.id)}
 >
 <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
 <GripVertical className="h-4 w-4" />
 Drag widget
 </div>
 <DashboardWidgetContent data={widgetData} id={widget.id} />
 </div>
 ))
 )}
 </div>

 <Card className="glass rounded-2xl">
 <CardHeader>
 <CardTitle>Project Templates</CardTitle>
 <p className="text-sm text-muted-foreground">Start faster with proven operating templates.</p>
 </CardHeader>
 <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 {projectTemplates.map((template) => (
 <Link className="rounded-2xl border bg-background p-4 font-semibold transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass" key={template} to="/projects">
 {template}
 </Link>
 ))}
 </CardContent>
 </Card>

 <Card className="glass rounded-2xl">
 <CardHeader>
 <CardTitle>Quick Actions</CardTitle>
 </CardHeader>
 <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
 {quickActions.map((action) => {
 const Icon = action.icon;
 return (
 <Link className="flex min-h-28 flex-col items-start justify-between rounded-2xl border bg-background p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass" key={action.label} to={action.href}>
 <Icon className="h-5 w-5 text-primary" />
 <span className="text-sm font-semibold">{action.label}</span>
 </Link>
 );
 })}
 </CardContent>
 </Card>
 </>
 )}
 </div>
 </main>
 );
}

type ActivityEntry = { title: string; detail: string; time: string; icon: LucideIcon };

function ActivityPanel() {
 const [activity, setActivity] = useState<ActivityEntry[]>([]);
 const loadSequenceRef = useRef(0);

 const loadActivity = useCallback(async () => {
 const requestId = loadSequenceRef.current + 1;
 loadSequenceRef.current = requestId;
 const [recentProjects, recentTasks] = await Promise.all([fetchRecentProjects(3), fetchRecentTasks(3)]);
 if (requestId !== loadSequenceRef.current) return;

 const entries: ActivityEntry[] = [];
 if (recentProjects.status === "ok") {
 recentProjects.data.forEach((project) =>
 entries.push({
 title: "Project updated",
 detail: `${project.projectName} — ${project.status}`,
 time: formatDateTime(project.updatedAt),
 icon: FolderKanban,
 }),
 );
 }
 if (recentTasks.status === "ok") {
 recentTasks.data.forEach((task) =>
 entries.push({
 title: "Task updated",
 detail: `${task.title} — ${task.status}`,
 time: formatDateTime(task.updatedAt),
 icon: CheckCircle2,
 }),
 );
 }
 setActivity(entries);
 }, []);

 useEffect(() => {
 let active = true;
 const refreshIfActive = () => {
 if (!active) return;
 void loadActivity();
 };

 void loadActivity();
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
 }, [loadActivity]);

 return (
 <aside className="hidden w-[360px] shrink-0 border-l bg-card p-5 xl:block">
 <div className="sticky top-20 space-y-5">
 <div>
 <p className="text-sm font-semibold text-primary">Activity Feed</p>
 <h2 className="mt-2 text-xl font-bold">Live Operations</h2>
 </div>
 <div className="relative space-y-3">
 <div className="absolute bottom-4 left-5 top-4 w-px bg-border" />
 {activity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity yet.</p>}
 {activity.map((item, index) => {
 const Icon = item.icon;
 return (
 <motion.div animate={{ opacity: 1, x: 0 }} className="relative rounded-2xl border bg-background p-4 pl-14" initial={{ opacity: 0, x: 16 }} key={`${item.title}-${item.detail}`} transition={{ delay: index * 0.04 }}>
 <span className="absolute left-2 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
 <Icon className="h-4 w-4" />
 </span>
 <p className="text-sm font-semibold leading-6">{item.title}</p>
 <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
 <p className="mt-2 text-xs text-muted-foreground">{item.time}</p>
 </motion.div>
 );
 })}
 </div>
 </div>
 </aside>
 );
}

export function DashboardPage() {
 const [collapsed, setCollapsed] = useState(false);
 const [mobileOpen, setMobileOpen] = useState(false);
 const [attendanceOpen, setAttendanceOpen] = useState(false);
 const navigate = useNavigate();
 const location = useLocation();
 const isDockedNav = useMediaQuery("(min-width: 768px)");
 const session = useMemo(() => getStoredAuthSession(), []);
 const userLabel = session?.user.fullName ?? session?.user.role ?? "User";

 const handleLogout = () => {
 clearAuthSession();
 navigate("/login");
 };

 useEffect(() => {
 setMobileOpen(false);
 }, [location.pathname]);

 useEffect(() => {
 if (isDockedNav) setMobileOpen(false);
 }, [isDockedNav]);

 return (
 <div className="min-h-screen bg-enterprise">
 <div className="flex min-h-screen">
 <Sidebar
 collapsed={collapsed}
 mobileOpen={mobileOpen}
 onCloseMobile={() => setMobileOpen(false)}
 onOpenAttendance={() => setAttendanceOpen(true)}
 onLogout={handleLogout}
 onToggle={() => setCollapsed((value) => !value)}
 />
 <div className="flex min-w-0 flex-1 flex-col">
 <MobileSidebarToggle onOpenSidebar={() => setMobileOpen(true)} />
 <div className="flex min-w-0 flex-1">
 <DashboardContent userLabel={userLabel} />
 <ActivityPanel />
 <AttendanceDrawer onClose={() => setAttendanceOpen(false)} open={attendanceOpen} />
 </div>
 </div>
 </div>
 </div>
 );
}
