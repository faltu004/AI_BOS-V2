import {
  Bell,
  BriefcaseBusiness,
  CheckSquare,
  ContactRound,
  FileBarChart,
  FileText,
  FolderKanban,
  MessageSquare,
  Package,
  Plug,
  ReceiptText,
  Settings,
  UserPlus,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";
import type { QuickCreateAction, WorkspaceSearchItem } from "@shared/platform/types";

export const workspaceSearchItems: WorkspaceSearchItem[] = [
  { id: "nav-dashboard", title: "Dashboard", category: "Navigation", href: "/dashboard", keywords: ["home", "overview"], icon: BriefcaseBusiness, roles: ["Owner", "Administrator"] },
  { id: "nav-admin", title: "Admin Access", category: "Administrator", href: "/admin", keywords: ["admin", "roles", "permissions", "audit"], icon: BriefcaseBusiness, roles: ["Owner", "Administrator"] },
  { id: "nav-analytics", title: "Analytics", category: "Reports", href: "/analytics", keywords: ["charts", "kpi", "reports"], icon: FileBarChart, roles: ["Owner", "Administrator"] },
  { id: "nav-finance", title: "Finance", category: "Finance", href: "/finance", keywords: ["invoice", "payment", "revenue", "budget"], icon: WalletCards, roles: ["Owner", "Administrator"] },
  { id: "nav-projects", title: "Projects", category: "Projects", href: "/projects", keywords: ["delivery", "budget", "timeline"], icon: FolderKanban, roles: ["Owner", "Administrator"] },
  { id: "nav-tasks", title: "Tasks", category: "Tasks", href: "/tasks", keywords: ["todo", "kanban", "approvals", "execution"], icon: CheckSquare, roles: ["Owner", "Administrator"] },
  { id: "nav-documents", title: "Documents", category: "Documents", href: "/documents", keywords: ["files", "contracts", "policy", "reports"], icon: FileText, roles: ["Owner", "Administrator"] },
  { id: "nav-workflows", title: "Workflow Automation", category: "Automation", href: "/workflows", keywords: ["workflow", "automation", "triggers"], icon: Workflow, roles: ["Owner", "Administrator"] },
  { id: "nav-integrations", title: "Integrations", category: "System", href: "/integrations", keywords: ["slack", "salesforce", "quickbooks", "sync"], icon: Plug, roles: ["Owner", "Administrator"] },
  { id: "nav-crm", title: "CRM", category: "Customers", href: "/crm", keywords: ["leads", "deals", "pipeline", "customers"], icon: ContactRound, roles: ["Owner", "Administrator"] },
  { id: "nav-products", title: "Products", category: "Products", href: "/products", keywords: ["inventory", "pricing", "catalog", "stock"], icon: Package, roles: ["Owner", "Administrator"] },
  { id: "nav-employees", title: "Employees", category: "Team", href: "/employees", keywords: ["hr", "team", "departments", "people"], icon: UsersRound, roles: ["Owner", "Administrator"] },
  { id: "nav-team-accounts", title: "Team Accounts", category: "Team", href: "/team-accounts", keywords: ["users", "accounts", "create profile", "onboard"], icon: UserPlus, roles: ["Owner", "Administrator"] },
  { id: "nav-settings", title: "Settings", category: "System", href: "/settings", keywords: ["company", "security", "preferences"], icon: Settings, roles: ["Owner", "Administrator"] },
  { id: "nav-messenger", title: "Company Messenger", category: "Collaboration", href: "/messenger", keywords: ["chat", "messages", "notes", "mentions", "discussion", "collaboration"], icon: MessageSquare, roles: ["Owner", "Administrator"] },
  { id: "nav-notifications", title: "Notification Center", category: "Notifications", href: "/notifications", keywords: ["notifications", "alerts", "reminders", "preferences"], icon: Bell, roles: ["Owner", "Administrator"] },
];

export const quickCreateActions: QuickCreateAction[] = [
  { label: "Workflow", href: "/workflows", icon: Workflow, roles: ["Owner", "Administrator"] },
  { label: "Task", href: "/tasks", icon: CheckSquare, roles: ["Owner", "Administrator"] },
  { label: "Employee", href: "/employees", icon: UserPlus, roles: ["Owner", "Administrator"] },
  { label: "Document", href: "/documents", icon: FileText, roles: ["Owner", "Administrator"] },
  { label: "Message", href: "/messenger", icon: MessageSquare, roles: ["Owner", "Administrator"] },
];
