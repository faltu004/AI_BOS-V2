import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ContactRound,
  FileText,
  MessageSquare,
  Package,
  ReceiptText,
  SquarePen,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { QuickCreateAction, WorkspaceSearchItem } from "@shared/platform/types";

export const frontlineRoles = ["Employee", "HR", "Finance", "Sales", "Support", "Developer", "Guest"] as const;
export const hrRoles = ["HR"] as const;
export const salesRoles = ["Sales"] as const;
export const financeRoles = ["Finance", "Sales"] as const;

export const workspaceSearchItems: WorkspaceSearchItem[] = [
  { id: "nav-dashboard", title: "Dashboard", category: "Navigation", href: "/dashboard", keywords: ["home", "overview"], icon: BriefcaseBusiness, roles: frontlineRoles },
  { id: "nav-tasks", title: "Tasks", category: "Tasks", href: "/tasks", keywords: ["todo", "kanban", "work"], icon: SquarePen, roles: frontlineRoles },
  { id: "nav-employees", title: "Employees", category: "Employees", href: "/employees", keywords: ["hr", "team", "people"], icon: UsersRound, roles: ["HR"] },
  { id: "nav-team-accounts", title: "Team Accounts", category: "Employees", href: "/team-accounts", keywords: ["users", "accounts", "create profile", "onboard"], icon: UserPlus, roles: ["HR"] },
  { id: "nav-crm", title: "CRM", category: "Customers", href: "/crm", keywords: ["leads", "customers", "deals"], icon: ContactRound, roles: ["Sales"] },
  { id: "nav-finance", title: "Finance", category: "Finance", href: "/finance", keywords: ["invoice", "payment", "revenue"], icon: WalletCards, roles: financeRoles },
  { id: "nav-products", title: "Products", category: "Products", href: "/products", keywords: ["inventory", "sku", "stock"], icon: Package, roles: ["Sales"] },
  { id: "nav-documents", title: "Documents", category: "Documents", href: "/documents", keywords: ["files", "pdf", "docs"], icon: FileText, roles: frontlineRoles },
  { id: "nav-meetings", title: "Meetings", category: "Meetings", href: "/meetings", keywords: ["calendar", "zoom", "meet"], icon: CalendarDays, roles: frontlineRoles },
  { id: "nav-messenger", title: "Company Messenger", category: "Collaboration", href: "/messenger", keywords: ["chat", "messages", "notes", "mentions", "discussion", "collaboration"], icon: MessageSquare, roles: frontlineRoles },
  { id: "nav-notifications", title: "Notification Center", category: "Notifications", href: "/notifications", keywords: ["notifications", "alerts", "reminders", "preferences"], icon: Bell, roles: frontlineRoles },
];

export const quickCreateActions: QuickCreateAction[] = [
  { label: "Task", href: "/tasks", icon: SquarePen, roles: frontlineRoles },
  { label: "Employee", href: "/employees", icon: UserPlus, roles: ["HR"] },
  { label: "Meeting", href: "/meetings", icon: CalendarDays, roles: frontlineRoles },
  { label: "Customer", href: "/crm", icon: ContactRound, roles: ["Sales"] },
  { label: "Invoice", href: "/finance", icon: ReceiptText, roles: financeRoles },
  { label: "Document", href: "/documents", icon: FileText, roles: frontlineRoles },
  { label: "Message", href: "/messenger", icon: MessageSquare, roles: frontlineRoles },
];
