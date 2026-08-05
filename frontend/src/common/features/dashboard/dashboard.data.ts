import type { LucideIcon } from "lucide-react";
import {
 AreaChart,
 BarChart3,
 CalendarDays,
 CheckSquare,
 ContactRound,
 FileBarChart,
 FileText,
 FolderKanban,
 LogOut,
 MessageSquare,
 Package,
 Plug,
 Settings,
 ShieldCheck,
 UploadCloud,
 UserPlus,
 UsersRound,
 WalletCards,
 Workflow,
} from "lucide-react";

export type DashboardNavItem = {
 label: string;
 icon: LucideIcon;
 href?: string;
 badge?: string;
 comingSoon?: boolean;
};

export type DashboardNavGroup = {
 label: string;
 items: DashboardNavItem[];
};

export type DashboardWidgetId = "overview" | "tasks" | "projects" | "notifications";

export type DashboardWidget = {
 id: DashboardWidgetId;
 title: string;
 visible: boolean;
};

export const dashboardNavGroups: DashboardNavGroup[] = [
 {
 label: "Dashboard",
 items: [
 { label: "Dashboard", icon: BarChart3, href: "/dashboard" },
 { label: "Admin", icon: ShieldCheck, href: "/admin" },
 ],
 },
 {
 label: "Workspace",
 items: [
 { label: "Projects", icon: FolderKanban, href: "/projects" },
 { label: "Tasks", icon: CheckSquare, href: "/tasks" },
 { label: "Meetings", icon: CalendarDays, href: "/meetings" },
 { label: "Messenger", icon: MessageSquare, href: "/messenger" },
 { label: "Documents", icon: FileText, href: "/documents" },
 { label: "Workflows", icon: Workflow, href: "/workflows" },
 { label: "Integrations", icon: Plug, href: "/integrations" },
 ],
 },
 {
 label: "Business",
 items: [
 { label: "CRM", icon: ContactRound, href: "/crm" },
 { label: "Finance", icon: WalletCards, href: "/finance" },
 { label: "Products", icon: Package, href: "/products" },
 { label: "Analytics", icon: AreaChart, href: "/analytics" },
 ],
 },
 {
 label: "Team",
 items: [
 { label: "Employees", icon: UsersRound, href: "/employees" },
 { label: "Departments", icon: UsersRound, href: "/employees" },
 ],
 },
 {
 label: "System",
 items: [
 { label: "Settings", icon: Settings, href: "/settings" },
 ],
 },
];

export const dashboardNavItems = dashboardNavGroups.flatMap((group) => group.items);
export const dashboardLogoutItem = { label: "Logout", icon: LogOut };

export type SmartKpi = { label: string; value: string; change: string; icon: LucideIcon; href: string };

export const initialWidgets: DashboardWidget[] = [
 { id: "overview", title: "Business Overview", visible: true },
 { id: "tasks", title: "Pending Tasks", visible: true },
 { id: "projects", title: "Recent Projects", visible: true },
 { id: "notifications", title: "Notifications", visible: true },
];

export const projectTemplates = [
 "Website",
 "CRM",
 "ERP",
 "Hospital",
 "E-commerce",
 "Startup",
 "Product",
 "Marketing Campaign",
];

export const quickActions = [
 { label: "Open Messenger", icon: MessageSquare, href: "/messenger" },
 { label: "Create Project", icon: FolderKanban, href: "/projects" },
 { label: "Add Employee", icon: UserPlus, href: "/employees" },
 { label: "Upload Document", icon: UploadCloud, href: "/documents" },
 { label: "Generate Report", icon: FileBarChart, href: "/analytics" },
];
