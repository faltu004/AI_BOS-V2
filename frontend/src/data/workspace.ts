import {
  Bot,
  BookOpenText,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ContactRound,
  FileBarChart,
  FileText,
  FolderKanban,
  Globe,
  Package,
  Plug,
  ReceiptText,
  Settings,
  Sparkles,
  SquarePen,
  UserPlus,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkspaceSearchItem = {
  id: string;
  title: string;
  category: string;
  href: string;
  keywords: string[];
  icon: LucideIcon;
};

export type QuickCreateAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const commandPaletteOpenEvent = "ai-bos:open-command-palette";
export const quickActionsOpenEvent = "ai-bos:open-quick-actions";

export const workspaceSearchItems: WorkspaceSearchItem[] = [
  { id: "nav-dashboard", title: "Dashboard", category: "Navigation", href: "/dashboard", keywords: ["home", "overview"], icon: Building2 },
  { id: "nav-projects", title: "Projects", category: "Projects", href: "/projects", keywords: ["website", "crm", "delivery"], icon: FolderKanban },
  { id: "nav-tasks", title: "Tasks", category: "Tasks", href: "/tasks", keywords: ["todo", "kanban", "work"], icon: SquarePen },
  { id: "nav-employees", title: "Employees", category: "Employees", href: "/employees", keywords: ["hr", "team", "people"], icon: UsersRound },
  { id: "nav-crm", title: "CRM", category: "Customers", href: "/crm", keywords: ["leads", "customers", "deals"], icon: ContactRound },
  { id: "nav-finance", title: "Finance", category: "Finance", href: "/finance", keywords: ["invoice", "payment", "revenue"], icon: WalletCards },
  { id: "nav-products", title: "Products", category: "Products", href: "/products", keywords: ["inventory", "sku", "stock"], icon: Package },
  { id: "nav-documents", title: "Documents", category: "Documents", href: "/documents", keywords: ["files", "pdf", "docs"], icon: FileText },
  { id: "nav-knowledge", title: "RAG Knowledge Base", category: "AI", href: "/knowledge", keywords: ["rag", "embeddings", "semantic", "knowledge", "source references"], icon: BookOpenText },
  { id: "nav-meetings", title: "Meetings", category: "Meetings", href: "/meetings", keywords: ["calendar", "zoom", "meet"], icon: CalendarDays },
  { id: "nav-analytics", title: "Analytics", category: "Reports", href: "/analytics", keywords: ["charts", "kpi", "reports"], icon: ReceiptText },
  { id: "nav-bi-ai", title: "Business Intelligence AI", category: "AI", href: "/business-intelligence", keywords: ["revenue", "expenses", "delayed projects", "approvals", "weekly summary"], icon: BrainCircuit },
  { id: "nav-settings", title: "Settings", category: "Settings", href: "/settings", keywords: ["theme", "company", "security"], icon: Settings },
  { id: "nav-admin", title: "Admin Panel", category: "Admin", href: "/admin", keywords: ["roles", "permissions", "audit"], icon: BriefcaseBusiness },
  { id: "nav-ai-config", title: "AI Configuration", category: "Admin", href: "/admin/ai-config", keywords: ["openai", "gemini", "ollama", "groq", "openrouter", "keys", "rag"], icon: Bot },
  { id: "nav-multi-agent", title: "Multi-Agent AI", category: "AI", href: "/multi-agent", keywords: ["ceo", "hr", "finance", "sales", "marketing", "developer", "support", "agents", "langgraph"], icon: Bot },
  { id: "nav-workflows", title: "Workflow Automation", category: "Automation", href: "/workflows", keywords: ["workflow", "automation", "triggers", "actions", "conditions", "approval", "notifications", "drag-drop"], icon: Workflow },
  { id: "nav-reports", title: "AI Reports", category: "Reports", href: "/reports", keywords: ["reports", "generate", "export", "schedule", "pdf", "excel", "ai summary"], icon: FileBarChart },
  { id: "nav-integrations", title: "Integrations", category: "System", href: "/integrations", keywords: ["slack", "salesforce", "quickbooks", "zoom", "sync", "connect"], icon: Plug },
  { id: "nav-memory", title: "AI Memory", category: "AI", href: "/memory", keywords: ["memory", "context", "facts", "preferences", "conversations"], icon: BrainCircuit },
  { id: "nav-consultant", title: "AI Business Consultant", category: "AI", href: "/consultant", keywords: ["consultant", "business analysis", "health", "swot", "revenue", "expense", "sales", "risk", "recommendations", "executive summary"], icon: Sparkles },
  { id: "nav-copilot", title: "Global AI Copilot", category: "AI", href: "/copilot", keywords: ["copilot", "assistant", "chat", "context", "agents", "help", "questions", "insights"], icon: Bot },
  { id: "proj-sales", title: "AI Sales Copilot", category: "Project", href: "/projects/p-1", keywords: ["crm", "automation"], icon: FolderKanban },
  { id: "proj-finance", title: "Finance Automation", category: "Project", href: "/projects/p-2", keywords: ["invoice", "expense"], icon: WalletCards },
  { id: "doc-report", title: "Q3 Operating Report", category: "Document", href: "/documents", keywords: ["finance", "report"], icon: FileText },
  { id: "cust-orbit", title: "Orbit Finance", category: "Customer", href: "/crm", keywords: ["proposal", "deal"], icon: ContactRound },
];

export const quickCreateActions: QuickCreateAction[] = [
  { label: "Project", href: "/projects", icon: FolderKanban },
  { label: "Task", href: "/tasks", icon: SquarePen },
  { label: "Employee", href: "/employees", icon: UserPlus },
  { label: "Meeting", href: "/meetings", icon: CalendarDays },
  { label: "Customer", href: "/crm", icon: ContactRound },
  { label: "Invoice", href: "/finance", icon: ReceiptText },
  { label: "Document", href: "/documents", icon: FileText },
  { label: "Workflow", href: "/workflows", icon: Workflow },
  { label: "Report", href: "/reports", icon: FileBarChart },
  { label: "Integration", href: "/integrations", icon: Plug },
  { label: "Memory", href: "/memory", icon: BrainCircuit },
  { label: "Consultant", href: "/consultant", icon: Sparkles },
  { label: "Copilot", href: "/copilot", icon: Bot },
  { label: "Quick Note", href: "/documents", icon: Bot },
];
