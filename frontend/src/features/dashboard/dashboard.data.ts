import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AreaChart,
  BarChart3,
  Bot,
  BookOpenText,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CircleDollarSign,
  ContactRound,
  FileBarChart,
  FileText,
  FolderKanban,
  Globe,
  HeartPulse,
  LogOut,
  Package,
  Plug,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
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

export type DashboardWidgetId =
  | "overview"
  | "schedule"
  | "tasks"
  | "calendar"
  | "documents"
  | "projects"
  | "health"
  | "suggestions"
  | "deadlines"
  | "notifications";

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
      { label: "Documents", icon: FileText, href: "/documents" },
      { label: "Knowledge", icon: BookOpenText, href: "/knowledge" },
      { label: "Workflows", icon: Workflow, href: "/workflows" },
      { label: "Reports", icon: FileBarChart, href: "/reports" },
      { label: "Integrations", icon: Plug, href: "/integrations" },
      { label: "Memory", icon: BrainCircuit, href: "/memory" },
      { label: "AI Consultant", icon: Sparkles, href: "/consultant" },
      { label: "AI Copilot", icon: Bot, href: "/copilot" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "CRM", icon: ContactRound, href: "/crm" },
      { label: "Finance", icon: WalletCards, href: "/finance" },
      { label: "Products", icon: Package, href: "/products" },
      { label: "Analytics", icon: AreaChart, href: "/analytics" },
      { label: "BI AI", icon: BrainCircuit, href: "/business-intelligence" },
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
      { label: "AI Config", icon: Bot, href: "/admin/ai-config" },
      { label: "Multi-Agent AI", icon: Bot, href: "/multi-agent" },
      { label: "AI", icon: Bot, comingSoon: true },
    ],
  },
];

export const dashboardNavItems = dashboardNavGroups.flatMap((group) => group.items);
export const dashboardLogoutItem = { label: "Logout", icon: LogOut };

export const smartKpis = [
  { label: "Revenue", value: "$267K", change: "+29.6%", icon: CircleDollarSign, href: "/finance" },
  { label: "Projects", value: "128", change: "24 due soon", icon: FolderKanban, href: "/projects" },
  { label: "Customers", value: "1,284", change: "+64 this month", icon: ContactRound, href: "/crm" },
  { label: "Employees", value: "248", change: "+12 this month", icon: UsersRound, href: "/employees" },
];

export const initialWidgets: DashboardWidget[] = [
  { id: "overview", title: "Business Overview", visible: true },
  { id: "schedule", title: "Today's Schedule", visible: true },
  { id: "tasks", title: "Pending Tasks", visible: true },
  { id: "calendar", title: "Calendar Widget", visible: true },
  { id: "documents", title: "Recent Documents", visible: true },
  { id: "projects", title: "Recent Projects", visible: true },
  { id: "health", title: "Business Health Score", visible: true },
  { id: "suggestions", title: "AI Suggestions", visible: true },
  { id: "deadlines", title: "Upcoming Deadlines", visible: true },
  { id: "notifications", title: "Notifications", visible: true },
];

export const todaysSchedule = [
  { title: "Leadership Standup", time: "10:00 AM", type: "Meeting", tone: "primary" },
  { title: "Project Risk Review", time: "12:30 PM", type: "Delivery", tone: "warning" },
  { title: "Customer Pipeline Sync", time: "03:00 PM", type: "CRM", tone: "success" },
  { title: "Finance Automation Demo", time: "05:00 PM", type: "Finance", tone: "primary" },
];

export const pendingTasks = [
  { title: "Approve employee onboarding policy", priority: "High", owner: "Admin", due: "Today" },
  { title: "Review Q3 project budget", priority: "High", owner: "CEO", due: "Tomorrow" },
  { title: "Upload signed vendor agreement", priority: "Medium", owner: "Manager", due: "Jul 21" },
  { title: "Generate weekly operating report", priority: "Medium", owner: "Employee", due: "Jul 22" },
];

export const activityFeed = [
  { title: "Project Created", detail: "AI Sales Copilot workspace was created", time: "2 min ago", icon: FolderKanban },
  { title: "Task Completed", detail: "Dashboard QA checklist was finished", time: "18 min ago", icon: CheckCircle2 },
  { title: "Employee Added", detail: "New HR profile added to onboarding", time: "42 min ago", icon: UserPlus },
  { title: "Invoice Generated", detail: "INV-2026-003 generated for Zenith Health", time: "1 hr ago", icon: ReceiptText },
  { title: "Meeting Scheduled", detail: "Finance Automation Demo scheduled", time: "Today", icon: CalendarDays },
];

export const notifications = [
  { title: "3 project milestones need attention", category: "Projects", priority: "High", unread: true },
  { title: "Revenue forecast updated by Finance", category: "Finance", priority: "Medium", unread: true },
  { title: "New customer contract uploaded", category: "Documents", priority: "Low", unread: false },
  { title: "AI Assistant prepared task summary", category: "AI", priority: "Medium", unread: false },
];

export const calendarEvents = [
  { date: "18", label: "Leadership", type: "Meeting" },
  { date: "19", label: "Finance Demo", type: "Event" },
  { date: "21", label: "Orbit Follow-up", type: "CRM" },
  { date: "24", label: "Task Deadline", type: "Task" },
  { date: "26", label: "QA Review", type: "Project" },
];

export const recentDocuments = [
  { name: "Q3 Operating Report.pdf", type: "PDF", owner: "Aman Verma", href: "/documents" },
  { name: "Employee Onboarding Policy.docx", type: "DOCX", owner: "HR Lead", href: "/documents" },
  { name: "CRM Import Template.xlsx", type: "XLSX", owner: "Maya Chen", href: "/documents" },
];

export const recentProjects = [
  { name: "AI Sales Copilot", owner: "Manager", status: "On Track", progress: 82, due: "Aug 12", budget: "$120K", priority: "High", href: "/projects/p-1" },
  { name: "Finance Automation", owner: "Admin", status: "Review", progress: 64, due: "Aug 18", budget: "$185K", priority: "Critical", href: "/projects/p-2" },
  { name: "Employee Portal", owner: "CEO", status: "Planning", progress: 38, due: "Sep 02", budget: "$95K", priority: "Medium", href: "/projects/p-3" },
];

export const projectTemplates = [
  "Website",
  "CRM",
  "ERP",
  "Hospital",
  "E-commerce",
  "Startup",
  "AI Product",
  "Marketing Campaign",
];

export const businessHealth = [
  { label: "Business Health", value: 92, icon: HeartPulse },
  { label: "Productivity Score", value: 87, icon: Activity },
  { label: "Automation Coverage", value: 74, icon: Sparkles },
];

export const aiSuggestions = [
  "Review delayed Finance Automation dependencies before the 5 PM demo.",
  "Convert qualified CRM leads with values above $100K into follow-up sequences.",
  "Archive completed project files and move signed contracts to restricted folders.",
];

export const upcomingDeadlines = [
  { title: "AI Sales Copilot beta", date: "Aug 12", module: "Projects" },
  { title: "Orbit Finance proposal", date: "Jul 22", module: "CRM" },
  { title: "Dashboard QA pass", date: "Jul 26", module: "Tasks" },
];

export const quickActions = [
  { label: "Create Project", icon: FolderKanban, href: "/projects" },
  { label: "Add Employee", icon: UserPlus, href: "/employees" },
  { label: "Upload Document", icon: UploadCloud, href: "/documents" },
  { label: "Generate Report", icon: FileBarChart, href: "/analytics" },
];
