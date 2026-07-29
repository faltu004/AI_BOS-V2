import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Download,
  FileText,
  FolderKanban,
  GripVertical,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { EmptyState } from "@shared/ui/empty-state";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { SkeletonCard } from "@shared/ui/skeleton";
import { useIsTablet, useMediaQuery } from "@shared/hooks/useMediaQuery";
import { commandPaletteOpenEvent, quickActionsOpenEvent } from "@shared/platform/events";
import { cn, getInitials } from "@shared/lib/utils";
import { clearAuthSession, getStoredAuthSession } from "@shared/auth/auth-service";
import { useToast } from "@shared/ui/toast-context";
import {
  activityFeed,
  aiSuggestions,
  businessHealth,
  calendarEvents,
  dashboardLogoutItem,
  dashboardNavGroups,
  initialWidgets,
  notifications,
  pendingTasks,
  projectTemplates,
  quickActions,
  recentDocuments,
  recentProjects,
  smartKpis,
  todaysSchedule,
  upcomingDeadlines,
  type DashboardWidget,
  type DashboardWidgetId,
} from "./dashboard.data";

const overviewChart = [
  { month: "Jan", revenue: 124, customers: 820 },
  { month: "Feb", revenue: 138, customers: 870 },
  { month: "Mar", revenue: 152, customers: 936 },
  { month: "Apr", revenue: 171, customers: 1004 },
  { month: "May", revenue: 188, customers: 1108 },
  { month: "Jun", revenue: 206, customers: 1190 },
  { month: "Jul", revenue: 267, customers: 1284 },
];

type DashboardNotification = (typeof notifications)[number];

const dashboardLayoutStorageKey = "ai-bos-dashboard-layout";
const dashboardTaskStorageKey = "ai-bos-ceo-completed-tasks";
const dashboardNotificationStorageKey = "ai-bos-ceo-notifications";

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

function openCommandPalette() {
  window.dispatchEvent(new Event(commandPaletteOpenEvent));
}

function openQuickActions() {
  window.dispatchEvent(new Event(quickActionsOpenEvent));
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function readStoredStringList(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onLogout,
  onToggle,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
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
          "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex border-r bg-background/88 backdrop-blur-2xl transition-all duration-300 md:sticky md:top-0 md:z-auto md:h-screen",
          effectiveCollapsed ? "w-[88px]" : "w-[292px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex h-12 items-center justify-between gap-2">
            <Link className="flex min-w-0 items-center gap-3" to="/">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-4 w-4" />
              </span>
              {!effectiveCollapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold">Nexora</span>
                  <span className="block truncate text-xs text-muted-foreground">Operating System</span>
                </span>
              )}
            </Link>
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

function TopNavbar({
  notificationItems,
  onDismissNotification,
  onMarkAllNotificationsRead,
  onOpenSidebar,
  userLabel,
}: {
  notificationItems: DashboardNotification[];
  onDismissNotification: (title: string) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenSidebar: () => void;
  userLabel: string;
}) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const unreadCount = notificationItems.filter((item) => item.unread).length;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/78 backdrop-blur-2xl">
      <div className="flex min-h-16 items-center gap-3 px-4 lg:px-6">
        <Button aria-label="Open sidebar" className="md:hidden" onClick={onOpenSidebar} size="icon" type="button" variant="ghost">
          <Menu className="h-5 w-5" />
        </Button>

        <button
          className="hidden h-11 min-w-0 flex-1 max-w-2xl items-center gap-3 rounded-2xl border bg-card/65 px-4 text-left text-sm text-muted-foreground shadow-sm transition-all hover:border-primary/35 hover:bg-muted/40 md:flex"
          onClick={openCommandPalette}
          type="button"
        >
          <Search className="h-4 w-4" />
          <span className="min-w-0 flex-1 truncate">Search everything...</span>
          <span className="rounded-lg border bg-background px-2 py-1 text-[11px] font-semibold">Ctrl K</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Button className="hidden rounded-xl sm:inline-flex" onClick={openQuickActions} type="button">
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
          <div className="relative">
            <Button aria-label="Notifications" className="rounded-xl" onClick={() => setNotificationOpen((value) => !value)} size="icon" type="button" variant="ghost">
              <Bell className="h-4 w-4" />
            </Button>
            {notificationOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-2xl border bg-background/95 p-3 shadow-glass backdrop-blur-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold">Notification Center</p>
                  <button className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" onClick={onMarkAllNotificationsRead} type="button">
                    {unreadCount} unread
                  </button>
                </div>
                <div className="space-y-2">
                  {notificationItems.map((item) => (
                    <button className="w-full rounded-xl border bg-card/65 p-3 text-left transition-colors hover:bg-muted/50" key={item.title} onClick={() => onDismissNotification(item.title)} type="button">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold leading-6">{item.title}</p>
                        {item.unread && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.category} - {item.priority}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <ThemeToggle />
          <Link className="flex h-11 items-center gap-3 rounded-2xl border bg-card/70 px-2 pr-3 text-left transition-colors hover:bg-muted" to="/profile">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
              {getInitials(userLabel)}
            </span>
            <span className="hidden min-w-0 text-sm font-semibold sm:block">{userLabel}</span>
          </Link>
        </div>
      </div>
      <div className="border-t px-4 py-3 md:hidden">
        <button className="flex h-11 w-full items-center gap-3 rounded-2xl border bg-card/65 px-4 text-left text-sm text-muted-foreground" onClick={openCommandPalette} type="button">
          <Search className="h-4 w-4" />
          Search everything...
        </button>
      </div>
    </header>
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

function HealthRing({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-background/65 p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="mt-3 text-sm font-semibold">{label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DashboardWidgetContent({
  completedTasks = [],
  id,
  notificationItems = notifications,
  onDismissNotification,
  onToggleTask,
}: {
  completedTasks?: string[];
  id: DashboardWidgetId;
  notificationItems?: DashboardNotification[];
  onDismissNotification?: (title: string) => void;
  onToggleTask?: (title: string) => void;
}) {
  if (id === "overview") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {smartKpis.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={item.label} transition={{ delay: index * 0.04 }}>
              <Link to={item.href}>
                <Card className="h-full rounded-2xl bg-card/70 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
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

  if (id === "schedule") {
    return (
      <SmartCard icon={CalendarDays} title="Today's Schedule">
        <div className="space-y-3">
          {todaysSchedule.map((item) => (
            <div className="flex items-center justify-between gap-4 rounded-2xl border bg-background/65 p-4" key={item.title}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.type}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{item.time}</span>
            </div>
          ))}
        </div>
      </SmartCard>
    );
  }

  if (id === "tasks") {
    return (
      <SmartCard icon={CheckSquare} title="Pending Tasks">
        <div className="space-y-3">
          {pendingTasks.map((task) => (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-background/65 p-4 transition-colors hover:bg-muted/55" key={task.title}>
              <input
                checked={completedTasks.includes(task.title)}
                className="mt-1 h-4 w-4 accent-primary"
                type="checkbox"
                onChange={() => onToggleTask?.(task.title)}
              />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-semibold", completedTasks.includes(task.title) && "text-muted-foreground line-through")}>{task.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {task.owner} - {task.priority} - {task.due}
                </span>
              </span>
            </label>
          ))}
        </div>
      </SmartCard>
    );
  }

  if (id === "calendar") {
    return (
      <SmartCard icon={CalendarDays} title="Calendar Widget">
        <div className="grid grid-cols-5 gap-2">
          {calendarEvents.map((event) => (
            <div className="rounded-2xl border bg-background/65 p-3 text-center" key={`${event.date}-${event.label}`}>
              <p className="text-xl font-bold">{event.date}</p>
              <p className="mt-2 text-xs font-semibold">{event.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{event.type}</p>
            </div>
          ))}
        </div>
      </SmartCard>
    );
  }

  if (id === "documents") {
    return (
      <SmartCard icon={FileText} title="Recent Documents">
        <div className="space-y-3">
          {recentDocuments.map((document) => (
            <Link className="flex items-center justify-between gap-4 rounded-2xl border bg-background/65 p-4 transition-colors hover:bg-muted/55" key={document.name} to={document.href}>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{document.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {document.type} - {document.owner}
                </span>
              </span>
              <FileText className="h-4 w-4 text-primary" />
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
          {recentProjects.map((project) => (
            <Link className="rounded-2xl border bg-background/65 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass" key={project.name} to={project.href}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold leading-6">{project.name}</p>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{project.status}</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>{project.due}</span>
                <span>{project.budget}</span>
                <span>{project.priority}</span>
                <span>{project.owner}</span>
              </div>
            </Link>
          ))}
        </div>
      </SmartCard>
    );
  }

  if (id === "health") {
    return (
      <SmartCard icon={Sparkles} title="Business Health Score">
        <div className="grid gap-3 md:grid-cols-3">
          {businessHealth.map((item) => (
            <HealthRing icon={item.icon} key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </SmartCard>
    );
  }

  if (id === "suggestions") {
    return (
      <SmartCard className="bg-foreground text-background dark:bg-white dark:text-slate-950" icon={Sparkles} title="Suggestions">
        <div className="space-y-3">
          {aiSuggestions.map((suggestion) => (
            <p className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm leading-6 opacity-85" key={suggestion}>
              {suggestion}
            </p>
          ))}
        </div>
      </SmartCard>
    );
  }

  if (id === "deadlines") {
    return (
      <SmartCard icon={Bell} title="Upcoming Deadlines">
        <div className="space-y-3">
          {upcomingDeadlines.map((deadline) => (
            <div className="rounded-2xl border bg-background/65 p-4" key={deadline.title}>
              <p className="text-sm font-semibold">{deadline.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {deadline.module} - {deadline.date}
              </p>
            </div>
          ))}
        </div>
      </SmartCard>
    );
  }

  return (
    <SmartCard icon={Bell} title="Notifications">
      <div className="space-y-3">
        {notificationItems.map((item) => (
          <button className="w-full rounded-2xl border bg-background/65 p-4 text-left transition-colors hover:bg-muted/55" key={item.title} onClick={() => onDismissNotification?.(item.title)} type="button">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-6">{item.title}</p>
              {item.unread && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.category} - {item.priority}
            </p>
          </button>
        ))}
      </div>
    </SmartCard>
  );
}

function DashboardContent({
  completedTasks,
  notificationItems,
  onDismissNotification,
  onResetNotifications,
  onToggleTask,
  userLabel,
}: {
  completedTasks: string[];
  notificationItems: DashboardNotification[];
  onDismissNotification: (title: string) => void;
  onResetNotifications: () => void;
  onToggleTask: (title: string) => void;
  userLabel: string;
}) {
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(getSavedWidgets);
  const [draggingId, setDraggingId] = useState<DashboardWidgetId | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(dashboardLayoutStorageKey, JSON.stringify(widgets));
  }, [widgets]);

  const visibleWidgets = widgets.filter((widget) => widget.visible);

  const resetLayout = () => {
    setWidgets(initialWidgets);
    toast({ title: "Dashboard restored", description: "All CEO widgets are visible again.", type: "success" });
  };

  const exportDashboard = () => {
    downloadJson("ceo-dashboard-export.json", {
      exportedAt: new Date().toISOString(),
      completedTasks,
      notifications: notificationItems,
      widgets,
      overviewChart,
      smartKpis,
    });
    toast({ title: "Dashboard exported", description: "CEO dashboard snapshot downloaded.", type: "success" });
  };

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
              A modular operating dashboard for revenue, people, customers, projects, documents, meetings, and daily work.
            </p>
          </div>
          <div className="glass-soft rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={resetLayout} size="sm" type="button" variant="outline">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button onClick={exportDashboard} size="sm" type="button">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Drag widgets, hide sections, save layout locally.</p>
          </div>
        </motion.div>

        <Link
          className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass sm:flex-row sm:items-center sm:justify-between"
          to="/messenger"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Company Messenger</p>
              <p className="mt-1 text-sm text-muted-foreground">Open executive chat, direct messages, notes, and shared files.</p>
            </div>
          </div>
          <span className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 sm:w-auto">
            <MessageSquare className="h-4 w-4" />
            Open Messenger
          </span>
        </Link>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : (
          <>
            <DashboardWidgetContent id="overview" />

            <Card className="glass rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Business Overview</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">Revenue and customer growth trend.</p>
                </div>
                <Settings2 className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
                  <div className="h-72">
                    <ResponsiveContainer height="100%" width="100%">
                      <AreaChart data={overviewChart}>
                        <defs>
                          <linearGradient id="dashboardRevenue" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Area dataKey="revenue" fill="url(#dashboardRevenue)" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={3} type="monotone" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart data={overviewChart}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Bar dataKey="customers" fill="rgb(16 185 129)" name="Customers" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      widget.visible ? "bg-primary text-primary-foreground" : "bg-background/65 text-muted-foreground hover:text-foreground",
                    )}
                    key={widget.id}
                    onClick={() => setWidgets((current) => current.map((item) => (item.id === widget.id ? { ...item, visible: !item.visible } : item)))}
                    type="button"
                  >
                    {widget.title}
                  </button>
                ))}
                <button
                  className="inline-flex items-center gap-2 rounded-full border bg-background/65 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  onClick={resetLayout}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore all
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border bg-background/65 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  onClick={onResetNotifications}
                  type="button"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Reset alerts
                </button>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              {visibleWidgets.filter((widget) => widget.id !== "overview").length === 0 ? (
                <div className="xl:col-span-2">
                  <EmptyState
                    action={{ label: "Restore Widgets", onClick: resetLayout }}
                    description="Your dashboard can stay minimal, or you can bring back schedule, tasks, documents, suggestions, and more."
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
                      <DashboardWidgetContent
                        completedTasks={completedTasks}
                        id={widget.id}
                        notificationItems={notificationItems}
                        onDismissNotification={onDismissNotification}
                        onToggleTask={onToggleTask}
                      />
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
                  <Link className="rounded-2xl border bg-background/65 p-4 font-semibold transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass" key={template} to="/projects">
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
                    <Link className="flex min-h-28 flex-col items-start justify-between rounded-2xl border bg-background/65 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass" key={action.label} to={action.href}>
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

function ActivityPanel() {
  return (
    <aside className="hidden w-[360px] shrink-0 border-l bg-card/35 p-5 xl:block">
      <div className="sticky top-20 space-y-5">
        <div>
          <p className="text-sm font-semibold text-primary">Activity Feed</p>
          <h2 className="mt-2 text-xl font-bold">Live Operations</h2>
        </div>
        <div className="relative space-y-3">
          <div className="absolute bottom-4 left-5 top-4 w-px bg-border" />
          {activityFeed.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div animate={{ opacity: 1, x: 0 }} className="relative rounded-2xl border bg-background/65 p-4 pl-14" initial={{ opacity: 0, x: 16 }} key={item.title} transition={{ delay: index * 0.04 }}>
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
  const [completedTasks, setCompletedTasks] = useState<string[]>(() => readStoredStringList(dashboardTaskStorageKey));
  const [notificationItems, setNotificationItems] = useState<DashboardNotification[]>(() => {
    try {
      const raw = window.localStorage.getItem(dashboardNotificationStorageKey);
      return raw ? (JSON.parse(raw) as DashboardNotification[]) : notifications;
    } catch {
      return notifications;
    }
  });
  const navigate = useNavigate();
  const location = useLocation();
  const isDockedNav = useMediaQuery("(min-width: 768px)");
  const session = useMemo(() => getStoredAuthSession(), []);
  const userLabel = session?.user.fullName ?? session?.user.role ?? "User";
  const { toast } = useToast();

  useEffect(() => {
    window.localStorage.setItem(dashboardTaskStorageKey, JSON.stringify(completedTasks));
  }, [completedTasks]);

  useEffect(() => {
    window.localStorage.setItem(dashboardNotificationStorageKey, JSON.stringify(notificationItems));
  }, [notificationItems]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDockedNav) setMobileOpen(false);
  }, [isDockedNav]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const toggleTask = (title: string) => {
    setCompletedTasks((current) => {
      const isCompleted = current.includes(title);
      const next = isCompleted ? current.filter((item) => item !== title) : [...current, title];
      toast({
        title: isCompleted ? "Task reopened" : "Task completed",
        description: title,
        type: isCompleted ? "info" : "success",
      });
      return next;
    });
  };

  const dismissNotification = (title: string) => {
    setNotificationItems((current) => current.map((item) => (item.title === title ? { ...item, unread: false } : item)));
  };

  const markAllNotificationsRead = () => {
    setNotificationItems((current) => current.map((item) => ({ ...item, unread: false })));
    toast({ title: "Notifications cleared", description: "All CEO alerts are marked as read.", type: "success" });
  };

  const resetNotifications = () => {
    setNotificationItems(notifications);
    toast({ title: "Alerts reset", description: "Default CEO notification feed restored.", type: "info" });
  };

  return (
    <div className="min-h-screen bg-enterprise">
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          onLogout={handleLogout}
          onToggle={() => setCollapsed((value) => !value)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar
            notificationItems={notificationItems}
            onDismissNotification={dismissNotification}
            onMarkAllNotificationsRead={markAllNotificationsRead}
            onOpenSidebar={() => setMobileOpen(true)}
            userLabel={userLabel}
          />
          <div className="flex min-w-0 flex-1">
            <DashboardContent
              completedTasks={completedTasks}
              notificationItems={notificationItems}
              onDismissNotification={dismissNotification}
              onResetNotifications={resetNotifications}
              onToggleTask={toggleTask}
              userLabel={userLabel}
            />
            <ActivityPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
