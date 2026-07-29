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
      {
        key: "role",
        label: "Role",
        type: "select",
        options: ["Owner", "Administrator", "Manager", "HR", "Finance", "Sales", "Support", "Developer", "Employee", "Guest"],
        required: true,
      },
      { key: "status", label: "Status", type: "select", options: ["Active", "Suspended", "Pending"], required: true },
      { key: "lastLogin", label: "Last Login", type: "date" },
      { key: "password", label: "Password", type: "password" },
    ],
    records: [
      { id: "usr-1", name: "Isha Sinha", email: "isha.sinha@nexorasoftworks.dev", role: "Administrator", status: "Active", lastLogin: "2026-07-28", password: "********" },
      { id: "usr-2", name: "Kabir Arora", email: "kabir.arora@nexorasoftworks.dev", role: "Manager", status: "Active", lastLogin: "2026-07-27", password: "********" },
      { id: "usr-3", name: "Naina Rao", email: "naina.rao@nexorasoftworks.dev", role: "HR", status: "Active", lastLogin: "2026-07-26", password: "********" },
      { id: "usr-4", name: "Devika Menon", email: "devika.menon@nexorasoftworks.dev", role: "Finance", status: "Active", lastLogin: "2026-07-25", password: "********" },
      { id: "usr-5", name: "Rhea Kapoor", email: "rhea.kapoor@nexorasoftworks.dev", role: "Sales", status: "Active", lastLogin: "2026-07-25", password: "********" },
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
      { id: "prj-1", name: "PulseDesk CRM Modernization", manager: "Kabir Arora", status: "Active", budget: 5400000, deadline: "2026-08-14" },
      { id: "prj-2", name: "NexOps Internal ERP", manager: "Kabir Arora", status: "Active", budget: 7200000, deadline: "2026-09-30" },
      { id: "prj-3", name: "AtlasAI Support Assistant", manager: "Kabir Arora", status: "Planning", budget: 4100000, deadline: "2026-10-18" },
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
      { key: "department", label: "Department", type: "select", options: ["Engineering", "Product", "Design", "Operations", "Human Resources", "Finance", "Sales", "Customer Success"] },
      { key: "designation", label: "Designation", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Active", "On Leave", "Inactive"] },
      { key: "joiningDate", label: "Joining Date", type: "date" },
    ],
    records: [
      { id: "emp-1", name: "Tara Kulkarni", department: "Engineering", designation: "Senior Backend Engineer", status: "Active", joiningDate: "2026-03-09" },
      { id: "emp-2", name: "Devika Menon", department: "Finance", designation: "Finance Controller", status: "Active", joiningDate: "2026-02-10" },
      { id: "emp-3", name: "Rhea Kapoor", department: "Sales", designation: "Enterprise Account Executive", status: "Active", joiningDate: "2026-02-18" },
      { id: "emp-4", name: "Ethan Dsouza", department: "Operations", designation: "IT & Office Coordinator", status: "On Leave", joiningDate: "2026-06-15" },
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
      { id: "cus-1", name: "Priya Malhotra", company: "Northstar Retail", owner: "Rhea Kapoor", revenue: 5400000, health: "Excellent" },
      { id: "cus-2", name: "Arvind Rao", company: "Zenith HealthTech", owner: "Manav Bansal", revenue: 3900000, health: "Good" },
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
      { id: "pro-1", name: "NexOps Platform License", sku: "SKU-NEXOPS-ENT", category: "Subscriptions", price: 1499, stock: 128 },
      { id: "pro-2", name: "AtlasAI Support Assistant", sku: "SKU-ATLAS-AI", category: "Software", price: 799, stock: 42 },
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
      { id: "doc-1", name: "NexOps ERP Security Review.pdf", type: "PDF", owner: "Tara Kulkarni", permission: "Shared", tags: ["Engineering", "Security"] },
      { id: "doc-2", name: "Hybrid Work and Attendance.docx", type: "DOCX", owner: "Naina Rao", permission: "Restricted", tags: ["HR", "Policy"] },
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
      { id: "met-1", title: "Nexora Leadership Standup", organizer: "Aarav Mehta", date: "2026-07-24", status: "Completed", link: "https://meet.google.com/nexora-leadership" },
      { id: "met-2", title: "NexOps Release Review", organizer: "Tara Kulkarni", date: "2026-07-25", status: "Scheduled", link: "https://zoom.us/j/2026072501" },
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
      { id: "fin-1", name: "SecurePay Billing Portal Milestone", type: "Income", amount: 3900000, status: "Paid", date: "2026-06-21" },
      { id: "fin-2", name: "Cloud Infrastructure", type: "Expense", amount: 260000, status: "Approved", date: "2026-07-03" },
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
      { id: "set-1", name: "Primary Brand Color", group: "Theme", value: "#06b6d4", status: "Active" },
      { id: "set-2", name: "SMTP Provider", group: "Email", value: "AWS SES", status: "Needs Review" },
    ],
  },
];

export const adminRoles: AdminRole[] = [
  {
    id: "role-admin",
    name: "Administrator",
    description: "Full platform control.",
    permissions: Object.fromEntries(adminModules.map((module) => [module.id, module.permissions])),
  },
  {
    id: "role-owner",
    name: "Owner",
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
      { key: "brandColor", label: "Brand Color", type: "text", value: "#06b6d4" },
      { key: "glassUi", label: "Glass UI", type: "select", value: "Enabled", options: ["Enabled", "Disabled"] },
    ],
  },
  {
    id: "company",
    label: "Company Settings",
    description: "Manage organization identity and regional defaults.",
    settings: [
      { key: "companyName", label: "Company Name", type: "text", value: "Nexora Softworks Pvt. Ltd." },
      { key: "timezone", label: "Timezone", type: "select", value: "Asia/Kolkata", options: ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London"] },
      { key: "language", label: "Language", type: "select", value: "English", options: ["English", "Hindi", "Spanish"] },
    ],
  },
  {
    id: "email",
    label: "Email Settings",
    description: "Configure transactional email delivery.",
    settings: [
      { key: "smtpProvider", label: "SMTP Provider", type: "text", value: "AWS SES" },
      { key: "fromEmail", label: "From Email", type: "email", value: "no-reply@nexorasoftworks.dev" },
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
  { id: "log-1", actor: "Kabir Arora", action: "Updated NexOps Internal ERP project", module: "Projects", severity: "Info", timestamp: "2026-07-24 16:30" },
  { id: "log-2", actor: "System", action: "Generated daily backup snapshot", module: "Backup", severity: "Info", timestamp: "2026-07-24 02:00" },
  { id: "log-3", actor: "Naina Rao", action: "Changed employee document permission", module: "Documents", severity: "Warning", timestamp: "2026-07-23 18:10" },
];

export const adminAuditLogs: AdminLog[] = [
  { id: "audit-1", actor: "Isha Sinha", action: "Granted Manager edit access to CRM", module: "Roles", severity: "Critical", timestamp: "2026-07-24 12:20" },
  { id: "audit-2", actor: "System", action: "Blocked restore attempt without permission", module: "Security", severity: "Critical", timestamp: "2026-07-23 22:45" },
  { id: "audit-3", actor: "Administrator", action: "Rotated email API key", module: "Email Settings", severity: "Warning", timestamp: "2026-07-22 09:15" },
];

export const adminAnalytics: AdminAnalyticsPoint[] = [
  { month: "Jan", users: 9, revenue: 2100000, activity: 420, securityEvents: 4 },
  { month: "Feb", users: 11, revenue: 3100000, activity: 560, securityEvents: 3 },
  { month: "Mar", users: 13, revenue: 4400000, activity: 760, securityEvents: 5 },
  { month: "Apr", users: 15, revenue: 6200000, activity: 980, securityEvents: 3 },
  { month: "May", users: 17, revenue: 8100000, activity: 1210, securityEvents: 2 },
  { month: "Jun", users: 18, revenue: 10400000, activity: 1430, securityEvents: 3 },
  { month: "Jul", users: 18, revenue: 12200000, activity: 1680, securityEvents: 2 },
];

export const adminSystemCards = [
  { label: "Managed Modules", value: String(adminModules.length), icon: Building2 },
  { label: "Active Roles", value: String(adminRoles.length), icon: ShieldCheck },
  { label: "Revenue Control", value: "INR 12.2M", icon: ReceiptText },
  { label: "Email Health", value: "98.8%", icon: Mail },
  { label: "Security Score", value: "94%", icon: BriefcaseBusiness },
];
