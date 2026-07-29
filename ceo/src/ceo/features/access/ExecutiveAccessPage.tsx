import { motion } from "framer-motion";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CheckSquare,
  ContactRound,
  Download,
  FileText,
  FolderKanban,
  Package,
  Plug,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { fetchModuleAccess, updateModuleAccess } from "@shared/lib/module-access.api";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Input } from "@shared/ui/input";
import { useToast } from "@shared/ui/toast-context";
import type { LucideIcon } from "lucide-react";

export type ExecutiveModuleKey =
  | "admin"
  | "audit-backup"
  | "crm"
  | "documents"
  | "integrations"
  | "organization"
  | "products"
  | "profile"
  | "rbac"
  | "settings"
  | "tasks";

type ExecutiveRecord = {
  id: string;
  title: string;
  owner: string;
  status: string;
  value: string;
};

type ExecutiveModuleConfig = {
  title: string;
  eyebrow: string;
  subtitle: string;
  icon: LucideIcon;
  stats: { label: string; value: string; icon: LucideIcon }[];
  records: ExecutiveRecord[];
  actions: string[];
};

const moduleConfigs: Record<ExecutiveModuleKey, ExecutiveModuleConfig> = {
  admin: {
    title: "Admin Access",
    eyebrow: "Full Control",
    subtitle: "CEO access for roles, permissions, audit activity, module status, and governance actions.",
    icon: ShieldCheck,
    stats: [
      { label: "Active roles", value: "6", icon: UsersRound },
      { label: "Admin modules", value: "12", icon: ShieldCheck },
      { label: "Open audits", value: "4", icon: BadgeCheck },
      { label: "Access score", value: "99%", icon: BarChart3 },
    ],
    records: [
       { id: "adm-1", title: "Admin role policy", owner: "Owner", status: "Active", value: "Full access" },
      { id: "adm-2", title: "Manager permission review", owner: "Administrator", status: "Review", value: "Limited access" },
      { id: "adm-3", title: "Audit export package", owner: "Security", status: "Ready", value: "Q3" },
    ],
    actions: ["Approve role change", "Export audit log", "Review module access"],
  },
  "audit-backup": {
    title: "Audit & Backup",
    eyebrow: "Data Protection",
    subtitle: "System-wide audit trail and encrypted backup history for database and documents.",
    icon: ShieldCheck,
    stats: [
      { label: "Audit entries (24h)", value: "312", icon: FileText },
      { label: "Backups completed", value: "8", icon: Download },
      { label: "Auto backup", value: "Enabled", icon: BadgeCheck },
      { label: "Last restore", value: "None", icon: BarChart3 },
    ],
    records: [
      { id: "ab-1", title: "Database backup", owner: "Administrator", status: "Completed", value: "Encrypted" },
      { id: "ab-2", title: "Permission change review", owner: "Owner", status: "Logged", value: "Audit trail" },
      { id: "ab-3", title: "Documents backup", owner: "System", status: "Scheduled", value: "Daily" },
    ],
    actions: ["Run backup now", "Export audit log", "Review restore history"],
  },
  crm: {
    title: "CRM",
    eyebrow: "Revenue Control",
    subtitle: "Executive pipeline view with customer, deal, follow-up, and forecast controls.",
    icon: ContactRound,
    stats: [
      { label: "Pipeline", value: "$412K", icon: WalletCards },
      { label: "Active leads", value: "64", icon: ContactRound },
      { label: "Follow-ups", value: "21", icon: CheckSquare },
      { label: "Win rate", value: "38%", icon: BarChart3 },
    ],
    records: [
      { id: "crm-1", title: "Orbit Finance", owner: "Sales", status: "Proposal", value: "$82K" },
      { id: "crm-2", title: "Zenith Health", owner: "Sales", status: "Negotiation", value: "$126K" },
       { id: "crm-3", title: "Northstar Retail", owner: "Owner", status: "Executive review", value: "$204K" },
    ],
    actions: ["Approve discount", "Create follow-up", "Export forecast"],
  },
  documents: {
    title: "Documents",
    eyebrow: "Secure Files",
    subtitle: "Executive access for contracts, reports, policies, and uploaded knowledge assets.",
    icon: FileText,
    stats: [
      { label: "Documents", value: "386", icon: FileText },
      { label: "Restricted", value: "42", icon: ShieldCheck },
      { label: "Pending review", value: "9", icon: CheckSquare },
      { label: "Shared files", value: "58", icon: FileText },
    ],
    records: [
       { id: "doc-1", title: "Q3 Operating Report.pdf", owner: "Owner", status: "Approved", value: "Board" },
      { id: "doc-2", title: "Employee Onboarding Policy.docx", owner: "HR", status: "Review", value: "Policy" },
      { id: "doc-3", title: "CRM Import Template.xlsx", owner: "Sales", status: "Ready", value: "Template" },
    ],
    actions: ["Upload document", "Approve file", "Export index"],
  },
  integrations: {
    title: "Integrations",
    eyebrow: "Connected Systems",
    subtitle: "Connect, monitor, sync, and audit business integrations from the CEO view.",
    icon: Plug,
    stats: [
      { label: "Connected", value: "8", icon: Plug },
      { label: "Healthy", value: "7", icon: BadgeCheck },
      { label: "Sync jobs", value: "31", icon: BarChart3 },
      { label: "Warnings", value: "1", icon: ShieldCheck },
    ],
    records: [
      { id: "int-1", title: "Slack", owner: "Administrator", status: "Connected", value: "Healthy" },
      { id: "int-2", title: "QuickBooks", owner: "Finance", status: "Connected", value: "Sync due" },
      { id: "int-3", title: "Salesforce", owner: "Sales", status: "Connected", value: "Healthy" },
    ],
    actions: ["Run sync", "Reconnect app", "Export logs"],
  },
  organization: {
    title: "Organization",
    eyebrow: "Company Structure",
    subtitle: "CEO view of company profile, departments, branches, teams, and reporting structure.",
    icon: Building2,
    stats: [
      { label: "Departments", value: "3", icon: FolderKanban },
      { label: "Branches", value: "2", icon: Building2 },
      { label: "Teams", value: "0", icon: UsersRound },
      { label: "Policies", value: "1", icon: FileText },
    ],
    records: [
      { id: "org-1", title: "Head Office - Bengaluru", owner: "Administrator", status: "Active", value: "Branch" },
      { id: "org-2", title: "Engineering Department", owner: "Administrator", status: "Active", value: "Department" },
      { id: "org-3", title: "Working hours 09:30-18:30 IST", owner: "Administrator", status: "Configured", value: "Settings" },
    ],
    actions: ["Review org chart", "Approve department change", "Export org profile"],
  },
  rbac: {
    title: "Roles & Permissions",
    eyebrow: "Access Governance",
    subtitle: "Owner-level view of the permission matrix, custom roles, templates, and audit history.",
    icon: ShieldCheck,
    stats: [
      { label: "System roles", value: "10", icon: UsersRound },
      { label: "Custom roles", value: "0", icon: ShieldCheck },
      { label: "Permission groups", value: "5", icon: BadgeCheck },
      { label: "Audit events", value: "0", icon: FileText },
    ],
    records: [
      { id: "rbac-1", title: "Owner - Full Access", owner: "Owner", status: "Active", value: "System Role" },
      { id: "rbac-2", title: "Administrator - Full Access", owner: "Administrator", status: "Active", value: "System Role" },
      { id: "rbac-3", title: "Manager - 21 permissions", owner: "Manager", status: "Active", value: "System Role" },
    ],
    actions: ["Review permission matrix", "Approve role change", "Export audit log"],
  },
  products: {
    title: "Products",
    eyebrow: "Catalog Control",
    subtitle: "Executive access to product catalog, inventory, pricing, and forecast signals.",
    icon: Package,
    stats: [
      { label: "Products", value: "312", icon: Package },
      { label: "Low stock", value: "14", icon: CheckSquare },
      { label: "Revenue SKU", value: "$126K", icon: WalletCards },
      { label: "Forecast", value: "+18%", icon: BarChart3 },
    ],
    records: [
      { id: "prd-1", title: "Sales Suite", owner: "Product", status: "Active", value: "$49K" },
      { id: "prd-2", title: "Finance Automation", owner: "Product", status: "Active", value: "$71K" },
      { id: "prd-3", title: "Employee Portal", owner: "Product", status: "Planning", value: "$32K" },
    ],
    actions: ["Approve pricing", "Update forecast", "Export catalog"],
  },
  profile: {
    title: "Owner Profile",
    eyebrow: "Account",
    subtitle: "Manage Owner identity, session, role visibility, and executive preferences.",
    icon: UserRound,
    stats: [
      { label: "Role", value: "Owner", icon: ShieldCheck },
      { label: "Access", value: "Full", icon: BadgeCheck },
      { label: "Sessions", value: "1", icon: UserRound },
      { label: "Preferences", value: "8", icon: Settings },
    ],
    records: [
      { id: "pro-1", title: "Executive dashboard", owner: "Owner", status: "Default", value: "Enabled" },
      { id: "pro-2", title: "Notification digest", owner: "Owner", status: "Active", value: "Daily" },
      { id: "pro-3", title: "Theme preference", owner: "Owner", status: "Saved", value: "System" },
    ],
    actions: ["Save profile", "Update digest", "Export session"],
  },
  settings: {
    title: "Settings",
    eyebrow: "System Preferences",
    subtitle: "CEO-level preferences for company, security, dashboards, and operating controls.",
    icon: Settings,
    stats: [
      { label: "Security", value: "High", icon: ShieldCheck },
      { label: "Dashboards", value: "5", icon: BarChart3 },
      { label: "Policies", value: "18", icon: FileText },
      { label: "Automation", value: "74%", icon: Settings },
    ],
    records: [
      { id: "set-1", title: "Require two-factor authentication", owner: "Administrator", status: "Enabled", value: "Security" },
      { id: "set-2", title: "Executive dashboard layout", owner: "Owner", status: "Saved", value: "Dashboard" },
      { id: "set-3", title: "Quarterly backup policy", owner: "Administrator", status: "Active", value: "System" },
    ],
    actions: ["Save settings", "Review policy", "Export config"],
  },
  tasks: {
    title: "Tasks",
    eyebrow: "Execution Queue",
    subtitle: "Owner access to approvals, strategic tasks, operating risks, and manager follow-ups.",
    icon: CheckSquare,
    stats: [
      { label: "Open tasks", value: "74", icon: CheckSquare },
      { label: "High priority", value: "11", icon: ShieldCheck },
      { label: "Due today", value: "8", icon: BadgeCheck },
      { label: "Completed", value: "89%", icon: BarChart3 },
    ],
    records: [
      { id: "tsk-1", title: "Review Q3 project budget", owner: "Owner", status: "High", value: "Tomorrow" },
      { id: "tsk-2", title: "Approve onboarding policy", owner: "Administrator", status: "High", value: "Today" },
      { id: "tsk-3", title: "Generate weekly operating report", owner: "Manager", status: "Medium", value: "Today" },
    ],
    actions: ["Create task", "Approve task", "Export queue"],
  },
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExecutiveAccessPage({ moduleKey }: { moduleKey: ExecutiveModuleKey }) {
  const config = moduleConfigs[moduleKey];
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState(config.records);
  const [enabled, setEnabled] = useState(true);
  const [isTogglingAccess, setIsTogglingAccess] = useState(false);
  const { toast } = useToast();
  const session = getStoredAuthSession();
  const Icon = config.icon;
  const isAdminModule = moduleKey === "admin";

  useEffect(() => {
    if (!isAdminModule) return;
    fetchModuleAccess().then((access) => {
      if (access) setEnabled(access.adminPanelEnabled);
    });
  }, [isAdminModule]);

  const toggleAdminPanelAccess = async () => {
    setIsTogglingAccess(true);
    const nextEnabled = !enabled;
    const ok = await updateModuleAccess({ adminPanelEnabled: nextEnabled });
    setIsTogglingAccess(false);

    if (!ok) {
      toast({ title: "Could not update access", description: "Only the Owner can change this setting.", type: "error" });
      return;
    }

    setEnabled(nextEnabled);
    toast({
      title: nextEnabled ? "Admin Panel access restored" : "Admin Panel access disabled",
      description: nextEnabled
        ? "The Administrator can open the Admin Panel again."
        : "The Administrator can no longer open the Admin Panel in the admin portal.",
      type: "success",
    });
  };

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) =>
      `${record.title} ${record.owner} ${record.status} ${record.value}`.toLowerCase().includes(normalized),
    );
  }, [query, records]);

  const addRecord = () => {
    const nextRecord = {
      id: `${moduleKey}-${Date.now()}`,
      title: `New ${config.title} item`,
      owner: session?.user.role ?? "Owner",
      status: "Draft",
      value: "Created now",
    };
    setRecords((current) => [nextRecord, ...current]);
    toast({ title: "Added to this preview", description: "This module isn't wired to the backend yet — the item is local to this screen and resets on refresh.", type: "success" });
  };

  const approveRecord = (id: string) => {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, status: "Approved" } : record)));
    toast({ title: "Marked Approved in this preview", description: "This module isn't wired to the backend yet — nothing was saved.", type: "success" });
  };

  const runAction = (action: string) => {
    if (action.toLowerCase().includes("export")) {
      downloadJson(`${moduleKey}-export.json`, { module: config.title, records });
      toast({ title: "Export downloaded", description: `${config.title} data exported.`, type: "success" });
      return;
    }
    toast({ title: `${action} — preview only`, description: "This module isn't wired to the backend yet — no server-side action was performed.", type: "success" });
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="text-sm font-semibold text-primary hover:underline" to="/dashboard">
              Back to CEO Dashboard
            </Link>
            <div className="mt-4 flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-primary">{config.eyebrow}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{config.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{config.subtitle}</p>
                <p className="mt-2 max-w-2xl text-xs font-medium text-amber-600 dark:text-amber-400">
                  Preview module — actions here aren't saved to the server yet.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              disabled={isAdminModule && isTogglingAccess}
              onClick={isAdminModule ? toggleAdminPanelAccess : () => setEnabled((value) => !value)}
              type="button"
              variant={enabled ? "default" : "outline"}
            >
              {isAdminModule && isTogglingAccess ? "Updating..." : enabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </header>
        {isAdminModule && (
          <p className="mt-3 text-xs text-muted-foreground">
            {enabled
              ? "The Administrator can currently open the Admin Panel in the admin portal."
              : "The Administrator's Admin Panel is currently disabled in the admin portal."}
          </p>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {config.stats.map((stat, index) => {
            const StatIcon = stat.icon;
            return (
              <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 12 }} key={stat.label} transition={{ delay: index * 0.04 }}>
                <Card className="rounded-lg">
                  <CardContent className="p-5">
                    <StatIcon className="h-5 w-5 text-primary" />
                    <p className="mt-4 text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="rounded-lg">
            <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Records</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">Search, create, approve, and export this module.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={addRecord} type="button">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
                <Button onClick={() => runAction("Export records")} type="button" variant="outline">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder={`Search ${config.title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <div className="rounded-lg border bg-background/70 p-4" key={record.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{record.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {record.owner} - {record.value}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{record.status}</span>
                        <Button onClick={() => approveRecord(record.id)} size="sm" type="button" variant="outline">
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>CEO Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.actions.map((action) => (
                <button
                  className="flex w-full items-center justify-between rounded-lg border bg-background/70 px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5"
                  key={action}
                  onClick={() => runAction(action)}
                  type="button"
                >
                  {action}
                  <BadgeCheck className="h-4 w-4 text-primary" />
                </button>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
