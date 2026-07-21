import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ContactRound,
  FileText,
  FolderKanban,
  Mail,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { AdminAnalyticsPoint, AdminLog, AdminModule, AdminRole, AdminSettingGroup } from "./admin.types";

const fullPermissions = ["view", "create", "edit", "delete", "export", "restore", "manage"] as const;
const standardPermissions = ["view", "create", "edit", "delete", "export"] as const;

export const adminModules: AdminModule[] = [
  {
    id: "users",
    label: "Users",
    description: "Manage platform users, login access, and account status.",
    icon: UsersRound,
    permissions: [...fullPermissions],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "role", label: "Role", type: "select", options: ["Admin", "CEO", "Manager", "HR", "Employee"], required: true },
      { key: "status", label: "Status", type: "select", options: ["Active", "Suspended", "Pending"], required: true },
      { key: "lastLogin", label: "Last Login", type: "date" },
    ],
    records: [
      { id: "usr-1", name: "Aman Verma", email: "aman@aibos.com", role: "Admin", status: "Active", lastLogin: "2026-07-18" },
      { id: "usr-2", name: "Maya Chen", email: "maya@aibos.com", role: "Manager", status: "Active", lastLogin: "2026-07-17" },
      { id: "usr-3", name: "HR Lead", email: "hr@aibos.com", role: "HR", status: "Active", lastLogin: "2026-07-16" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    description: "Control project records, ownership, budget, and status.",
    icon: FolderKanban,
    permissions: [...standardPermissions],
    fields: [
      { key: "name", label: "Project Name", type: "text", required: true },
      { key: "manager", label: "Manager", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Planning", "Active", "On Hold", "Completed", "Delayed"] },
      { key: "budget", label: "Budget", type: "number" },
      { key: "deadline", label: "Deadline", type: "date" },
    ],
    records: [
      { id: "prj-1", name: "AI Sales Copilot", manager: "Operations Manager", status: "Active", budget: 120000, deadline: "2026-08-12" },
      { id: "prj-2", name: "Finance Automation", manager: "Chief Executive", status: "Delayed", budget: 185000, deadline: "2026-08-18" },
    ],
  },
  {
    id: "employees",
    label: "Employees",
    description: "Manage employee profiles, departments, and employment state.",
    icon: BadgeCheck,
    permissions: [...standardPermissions],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "department", label: "Department", type: "select", options: ["Engineering", "Operations", "Human Resources", "Finance", "Customer Success"] },
      { key: "designation", label: "Designation", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Active", "On Leave", "Inactive"] },
      { key: "joiningDate", label: "Joining Date", type: "date" },
    ],
    records: [
      { id: "emp-1", name: "Sofia Alvarez", department: "Engineering", designation: "Senior Frontend Engineer", status: "Active", joiningDate: "2024-11-04" },
      { id: "emp-2", name: "Arjun Mehta", department: "Finance", designation: "Finance Analyst", status: "On Leave", joiningDate: "2025-06-18" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    description: "Manage CRM customer accounts, health, and revenue ownership.",
    icon: ContactRound,
    permissions: [...standardPermissions],
    fields: [
      { key: "name", label: "Customer", type: "text", required: true },
      { key: "company", label: "Company", type: "text" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "revenue", label: "Revenue", type: "number" },
      { key: "health", label: "Health", type: "select", options: ["Excellent", "Good", "At Risk"] },
    ],
    records: [
      { id: "cus-1", name: "Rohan Gupta", company: "Acme Cloud", owner: "Aman Verma", revenue: 180000, health: "Excellent" },
      { id: "cus-2", name: "Emma Stone", company: "Northstar Labs", owner: "Maya Chen", revenue: 96000, health: "Good" },
    ],
  },
  {
    id: "products",
    label: "Products",
    description: "Manage products, inventory, suppliers, and SKU records.",
    icon: Package,
    permissions: [...standardPermissions],
    fields: [
      { key: "name", label: "Product", type: "text", required: true },
      { key: "sku", label: "SKU", type: "text" },
      { key: "category", label: "Category", type: "select", options: ["Software", "Hardware", "Services", "Subscriptions", "Add-ons"] },
      { key: "price", label: "Price", type: "number" },
      { key: "stock", label: "Stock", type: "number" },
    ],
    records: [
      { id: "pro-1", name: "AI BOS Enterprise License", sku: "SKU-AIBOS-ENT", category: "Subscriptions", price: 1499, stock: 128 },
      { id: "pro-2", name: "Analytics Data Connector", sku: "SKU-DATA-CON", category: "Software", price: 249, stock: 0 },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    description: "Manage files, tags, sharing, and permission states.",
    icon: FileText,
    permissions: [...standardPermissions],
    fields: [
      { key: "name", label: "Document", type: "text", required: true },
      { key: "type", label: "Type", type: "select", options: ["PDF", "DOCX", "XLSX", "PPTX", "Image"] },
      { key: "owner", label: "Owner", type: "text" },
      { key: "permission", label: "Permission", type: "select", options: ["Private", "Shared", "Restricted"] },
      { key: "tags", label: "Tags", type: "tags" },
    ],
    records: [
      { id: "doc-1", name: "Q3 Operating Report.pdf", type: "PDF", owner: "Aman Verma", permission: "Shared", tags: ["Finance", "Report"] },
      { id: "doc-2", name: "Employee Onboarding Policy.docx", type: "DOCX", owner: "HR Lead", permission: "Restricted", tags: ["HR", "Policy"] },
    ],
  },
  {
    id: "meetings",
    label: "Meetings",
    description: "Manage meeting schedules, links, participants, and status.",
    icon: CalendarDays,
    permissions: [...standardPermissions],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "organizer", label: "Organizer", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["Scheduled", "In Progress", "Completed", "Cancelled"] },
      { key: "link", label: "Meeting Link", type: "text" },
    ],
    records: [
      { id: "met-1", title: "Leadership Standup", organizer: "Aman Verma", date: "2026-07-18", status: "Completed", link: "https://meet.google.com/aibos-leadership" },
      { id: "met-2", title: "Finance Automation Demo", organizer: "Arjun Mehta", date: "2026-07-19", status: "Scheduled", link: "https://zoom.us/j/2026071901" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    description: "Manage finance records, invoices, payments, taxes, and budgets.",
    icon: WalletCards,
    permissions: [...standardPermissions, "restore"],
    fields: [
      { key: "name", label: "Record", type: "text", required: true },
      { key: "type", label: "Type", type: "select", options: ["Income", "Expense", "Invoice", "Payment", "Tax", "Budget"] },
      { key: "amount", label: "Amount", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Pending", "Paid", "Approved", "Filed"] },
      { key: "date", label: "Date", type: "date" },
    ],
    records: [
      { id: "fin-1", name: "AI BOS Enterprise Subscription", type: "Income", amount: 140000, status: "Paid", date: "2026-07-05" },
      { id: "fin-2", name: "Cloud Infrastructure", type: "Expense", amount: 26000, status: "Approved", date: "2026-07-03" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Manage application, company, security, and email configuration.",
    icon: Settings,
    permissions: [...fullPermissions],
    fields: [
      { key: "name", label: "Setting", type: "text", required: true },
      { key: "group", label: "Group", type: "select", options: ["Theme", "Company", "Email", "Security"] },
      { key: "value", label: "Value", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Disabled", "Needs Review"] },
    ],
    records: [
      { id: "set-1", name: "Primary Brand Color", group: "Theme", value: "#2563eb", status: "Active" },
      { id: "set-2", name: "SMTP Provider", group: "Email", value: "SendGrid", status: "Needs Review" },
    ],
  },
];

export const adminRoles: AdminRole[] = [
  {
    id: "role-admin",
    name: "Admin",
    description: "Full platform control.",
    permissions: Object.fromEntries(adminModules.map((module) => [module.id, module.permissions])),
  },
  {
    id: "role-ceo",
    name: "CEO",
    description: "Executive read/write access with limited restore controls.",
    permissions: Object.fromEntries(adminModules.map((module) => [module.id, module.permissions.filter((permission) => permission !== "delete" && permission !== "restore")])),
  },
  {
    id: "role-manager",
    name: "Manager",
    description: "Operational manager access.",
    permissions: {
      projects: ["view", "create", "edit", "export"],
      employees: ["view", "edit", "export"],
      customers: ["view", "create", "edit", "export"],
      products: ["view", "edit", "export"],
      documents: ["view", "create", "edit", "export"],
      meetings: ["view", "create", "edit", "export"],
    },
  },
  {
    id: "role-employee",
    name: "Employee",
    description: "Contributor access for assigned work.",
    permissions: {
      projects: ["view"],
      documents: ["view"],
      meetings: ["view", "create"],
    },
  },
];

export const adminSettingGroups: AdminSettingGroup[] = [
  {
    id: "theme",
    label: "Theme Settings",
    description: "Control default appearance and brand colors.",
    settings: [
      { key: "defaultTheme", label: "Default Theme", type: "select", value: "System", options: ["Light", "Dark", "System"] },
      { key: "brandColor", label: "Brand Color", type: "text", value: "#2563eb" },
      { key: "glassUi", label: "Glass UI", type: "select", value: "Enabled", options: ["Enabled", "Disabled"] },
    ],
  },
  {
    id: "company",
    label: "Company Settings",
    description: "Manage organization identity and regional defaults.",
    settings: [
      { key: "companyName", label: "Company Name", type: "text", value: "AI BOS" },
      { key: "timezone", label: "Timezone", type: "select", value: "Asia/Kolkata", options: ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London"] },
      { key: "language", label: "Language", type: "select", value: "English", options: ["English", "Hindi", "Spanish"] },
    ],
  },
  {
    id: "email",
    label: "Email Settings",
    description: "Configure transactional email delivery.",
    settings: [
      { key: "smtpProvider", label: "SMTP Provider", type: "text", value: "SendGrid" },
      { key: "fromEmail", label: "From Email", type: "email", value: "no-reply@aibos.com" },
      { key: "invoiceEmails", label: "Invoice Emails", type: "select", value: "Enabled", options: ["Enabled", "Disabled"] },
    ],
  },
  {
    id: "security",
    label: "Security Settings",
    description: "Manage authentication, sessions, and audit controls.",
    settings: [
      { key: "mfa", label: "MFA", type: "select", value: "Required", options: ["Required", "Optional", "Disabled"] },
      { key: "sessionTimeout", label: "Session Timeout", type: "number", value: 30 },
      { key: "auditRetention", label: "Audit Retention Days", type: "number", value: 365 },
    ],
  },
];

export const adminActivityLogs: AdminLog[] = [
  { id: "log-1", actor: "Aman Verma", action: "Updated Finance Automation project", module: "Projects", severity: "Info", timestamp: "2026-07-18 16:30" },
  { id: "log-2", actor: "System", action: "Generated daily backup snapshot", module: "Backup", severity: "Info", timestamp: "2026-07-18 02:00" },
  { id: "log-3", actor: "HR Lead", action: "Changed employee document permission", module: "Documents", severity: "Warning", timestamp: "2026-07-17 18:10" },
];

export const adminAuditLogs: AdminLog[] = [
  { id: "audit-1", actor: "Aman Verma", action: "Granted Manager edit access to CRM", module: "Roles", severity: "Critical", timestamp: "2026-07-18 12:20" },
  { id: "audit-2", actor: "System", action: "Blocked restore attempt without permission", module: "Security", severity: "Critical", timestamp: "2026-07-17 22:45" },
  { id: "audit-3", actor: "Admin", action: "Rotated email API key", module: "Email Settings", severity: "Warning", timestamp: "2026-07-16 09:15" },
];

export const adminAnalytics: AdminAnalyticsPoint[] = [
  { month: "Jan", users: 184, revenue: 124000, activity: 820, securityEvents: 8 },
  { month: "Feb", users: 196, revenue: 138000, activity: 910, securityEvents: 6 },
  { month: "Mar", users: 211, revenue: 152000, activity: 1050, securityEvents: 9 },
  { month: "Apr", users: 226, revenue: 171000, activity: 1180, securityEvents: 7 },
  { month: "May", users: 236, revenue: 188000, activity: 1320, securityEvents: 5 },
  { month: "Jun", users: 244, revenue: 206000, activity: 1460, securityEvents: 6 },
  { month: "Jul", users: 248, revenue: 267000, activity: 1680, securityEvents: 4 },
];

export const adminSystemCards = [
  { label: "Managed Modules", value: String(adminModules.length), icon: Building2 },
  { label: "Active Roles", value: String(adminRoles.length), icon: ShieldCheck },
  { label: "Revenue Control", value: "$267K", icon: ReceiptText },
  { label: "Email Health", value: "98.8%", icon: Mail },
  { label: "Security Score", value: "94%", icon: BriefcaseBusiness },
];
