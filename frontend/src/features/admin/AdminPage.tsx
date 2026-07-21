import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  DatabaseBackup,
  Download,
  FileClock,
  LockKeyhole,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  Bot,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog-context";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-context";
import { cn } from "@/lib/utils";
import {
  adminActivityLogs,
  adminAnalytics,
  adminAuditLogs,
  adminModules,
  adminRoles,
  adminSettingGroups,
  adminSystemCards,
} from "./admin.data";
import type { AdminLog, AdminModule, AdminPermission, AdminRecord, AdminRole, AdminSettingGroup } from "./admin.types";
import { canAccess, createEmptyRecord, downloadAdminBackup } from "./admin.utils";
import { AdminEntityTable } from "./components/AdminEntityTable";
import { AdminRecordModal } from "./components/AdminRecordModal";

type AdminTab = "modules" | "roles" | "logs" | "analytics" | "backup" | "settings";

const tabs: { id: AdminTab; label: string; icon: typeof ShieldCheck }[] = [
  { id: "modules", label: "Module Control", icon: ShieldCheck },
  { id: "roles", label: "Roles & Permissions", icon: LockKeyhole },
  { id: "logs", label: "Activity & Audit Logs", icon: FileClock },
  { id: "analytics", label: "Dashboard Analytics", icon: BarChart3 },
  { id: "backup", label: "Backup & Restore", icon: DatabaseBackup },
  { id: "settings", label: "System Settings", icon: Settings },
];

function nowStamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 16);
}

function appendLog(logs: AdminLog[], action: string, module: string, severity: AdminLog["severity"] = "Info") {
  return [
    {
      id: `log-${Date.now()}`,
      actor: "Admin",
      action,
      module,
      severity,
      timestamp: nowStamp(),
    },
    ...logs,
  ];
}

function SettingsPanel({
  groups,
  onChange,
}: {
  groups: AdminSettingGroup[];
  onChange: (groupId: string, key: string, value: string | number | string[]) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => (
        <Card className="glass" key={group.id}>
          <CardHeader>
            <CardTitle>{group.label}</CardTitle>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.settings.map((setting) => (
              <div className="space-y-2" key={setting.key}>
                <label className="text-sm font-semibold" htmlFor={`${group.id}-${setting.key}`}>
                  {setting.label}
                </label>
                {setting.type === "select" ? (
                  <select
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                    id={`${group.id}-${setting.key}`}
                    value={String(setting.value)}
                    onChange={(event) => onChange(group.id, setting.key, event.target.value)}
                  >
                    {setting.options?.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`${group.id}-${setting.key}`}
                    type={setting.type === "number" ? "number" : setting.type === "email" ? "email" : "text"}
                    value={String(setting.value)}
                    onChange={(event) =>
                      onChange(group.id, setting.key, setting.type === "number" ? Number(event.target.value) : event.target.value)
                    }
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LogsPanel({ activityLogs, auditLogs }: { activityLogs: AdminLog[]; auditLogs: AdminLog[] }) {
  const renderLogs = (logs: AdminLog[]) => (
    <div className="space-y-3">
      {logs.map((log) => (
        <div className="rounded-lg border bg-background/65 p-4" key={log.id}>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">{log.action}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {log.actor} - {log.module}
              </p>
            </div>
            <span
              className={cn(
                "w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
                log.severity === "Critical"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
                  : log.severity === "Warning"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                    : "bg-primary/10 text-primary",
              )}
            >
              {log.severity}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{log.timestamp}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>{renderLogs(activityLogs)}</CardContent>
      </Card>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileClock className="h-5 w-5 text-primary" />
            Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>{renderLogs(auditLogs)}</CardContent>
      </Card>
    </div>
  );
}

export function AdminPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [modules, setModules] = useState<AdminModule[]>(adminModules);
  const [roles, setRoles] = useState<AdminRole[]>(adminRoles);
  const [settings, setSettings] = useState<AdminSettingGroup[]>(adminSettingGroups);
  const [activityLogs, setActivityLogs] = useState<AdminLog[]>(adminActivityLogs);
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>(adminAuditLogs);
  const [activeTab, setActiveTab] = useState<AdminTab>("modules");
  const [activeModuleId, setActiveModuleId] = useState(adminModules[0].id);
  const [search, setSearch] = useState("");
  const [editingRecord, setEditingRecord] = useState<AdminRecord | null>(null);
  const [restoreStatus, setRestoreStatus] = useState("No restore file selected.");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0];

  const filteredRecords = useMemo(() => {
    return activeModule.records.filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase()));
  }, [activeModule.records, search]);

  const saveRecord = (record: AdminRecord) => {
    const exists = activeModule.records.some((item) => item.id === record.id);
    setModules((current) =>
      current.map((module) =>
        module.id === activeModule.id
          ? {
              ...module,
              records: exists ? module.records.map((item) => (item.id === record.id ? record : item)) : [record, ...module.records],
            }
          : module,
      ),
    );
    setActivityLogs((current) => appendLog(current, `${exists ? "Updated" : "Created"} record ${record.id}`, activeModule.label));
    setEditingRecord(null);
  };

  const deleteRecord = async (record: AdminRecord) => {
    const accepted = await confirm({
      title: "Delete admin record?",
      description: `Record ${record.id} will be removed from ${activeModule.label}.`,
      confirmLabel: "Delete Record",
      tone: "danger",
    });
    if (accepted) {
      setModules((current) =>
        current.map((module) =>
          module.id === activeModule.id
            ? { ...module, records: module.records.filter((item) => item.id !== record.id) }
            : module,
        ),
      );
      setAuditLogs((current) => appendLog(current, `Deleted record ${record.id}`, activeModule.label, "Warning"));
      toast({ title: "Admin record deleted", description: `${record.id} was removed from ${activeModule.label}.`, type: "warning" });
    }
  };

  const toggleRolePermission = (roleId: string, moduleId: string, permission: AdminPermission) => {
    setRoles((current) =>
      current.map((role) => {
        if (role.id !== roleId) return role;
        const permissions = role.permissions[moduleId] ?? [];
        const nextPermissions = permissions.includes(permission)
          ? permissions.filter((item) => item !== permission)
          : [...permissions, permission];
        return { ...role, permissions: { ...role.permissions, [moduleId]: nextPermissions } };
      }),
    );
    setAuditLogs((current) => appendLog(current, `Changed ${permission} permission`, "Roles", "Critical"));
  };

  const updateSetting = (groupId: string, key: string, value: string | number | string[]) => {
    setSettings((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              settings: group.settings.map((setting) => (setting.key === key ? { ...setting, value } : setting)),
            }
          : group,
      ),
    );
    setActivityLogs((current) => appendLog(current, `Updated setting ${key}`, "Settings"));
  };

  const exportBackup = () => {
    downloadAdminBackup({ modules, roles, settings, activityLogs, auditLogs, exportedAt: new Date().toISOString() });
    setActivityLogs((current) => appendLog(current, "Exported full admin backup", "Backup"));
  };

  const restoreBackup = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result));
        if (Array.isArray(backup.modules)) setModules(backup.modules);
        if (Array.isArray(backup.roles)) setRoles(backup.roles);
        if (Array.isArray(backup.settings)) setSettings(backup.settings);
        setRestoreStatus(`Restored ${file.name}`);
        setAuditLogs((current) => appendLog(current, `Restored backup ${file.name}`, "Backup", "Critical"));
      } catch {
        setRestoreStatus("Restore failed. Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const totalRecords = modules.reduce((sum, module) => sum + module.records.length, 0);

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Admin Panel</p>
            <h1 className="text-2xl font-bold">AI BOS Control Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <ThemeToggle />
            <Button asChild type="button">
              <Link to="/admin/ai-config">
                <Bot className="h-4 w-4" />
                AI Configuration
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {adminSystemCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={card.label} transition={{ delay: index * 0.04 }}>
                <Card className="glass h-full">
                  <CardContent className="p-5">
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold">{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="glass">
          <CardContent className="flex gap-2 overflow-x-auto p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button className="shrink-0" key={tab.id} onClick={() => setActiveTab(tab.id)} type="button" variant={activeTab === tab.id ? "default" : "outline"}>
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {activeTab === "modules" && (
          <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
            <aside className="space-y-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <button
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border bg-card/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40",
                      activeModuleId === module.id && "border-primary/50 bg-primary/5",
                    )}
                    key={module.id}
                    onClick={() => setActiveModuleId(module.id)}
                    type="button"
                  >
                    <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
                    <span>
                      <span className="block font-semibold">{module.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {module.records.length} records - {module.permissions.length} controls
                      </span>
                    </span>
                  </button>
                );
              })}
            </aside>

            <section className="min-w-0 space-y-4">
              <Card className="glass">
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <p className="text-sm font-semibold text-primary">{activeModule.label}</p>
                      <h2 className="mt-1 text-2xl font-bold">Dynamic Module Manager</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{activeModule.description}</p>
                    </div>
                    <Button onClick={() => setEditingRecord(createEmptyRecord(activeModule))} type="button">
                      <Plus className="h-4 w-4" />
                      Create Record
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder={`Search ${activeModule.label.toLowerCase()}...`} value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                </CardContent>
              </Card>
              <AdminEntityTable module={activeModule} onDelete={deleteRecord} onEdit={setEditingRecord} records={filteredRecords} />
            </section>
          </div>
        )}

        {activeTab === "roles" && (
          <Card className="glass overflow-hidden">
            <CardHeader>
              <CardTitle>Role-Based Access Control</CardTitle>
              <p className="text-sm text-muted-foreground">Toggle module permissions for each role from a single matrix.</p>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="p-4">Role</th>
                    <th className="p-4">Module</th>
                    {(["view", "create", "edit", "delete", "export", "restore", "manage"] as AdminPermission[]).map((permission) => (
                      <th className="p-4 text-center" key={permission}>
                        {permission}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.flatMap((role) =>
                    modules.map((module) => (
                      <tr className="border-b" key={`${role.id}-${module.id}`}>
                        <td className="p-4 font-semibold">{role.name}</td>
                        <td className="p-4 text-muted-foreground">{module.label}</td>
                        {(["view", "create", "edit", "delete", "export", "restore", "manage"] as AdminPermission[]).map((permission) => (
                          <td className="p-4 text-center" key={permission}>
                            <input
                              checked={canAccess(role, module.id, permission)}
                              className="h-4 w-4 accent-primary"
                              onChange={() => toggleRolePermission(role.id, module.id, permission)}
                              type="checkbox"
                            />
                          </td>
                        ))}
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "logs" && <LogsPanel activityLogs={activityLogs} auditLogs={auditLogs} />}

        {activeTab === "analytics" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Dashboard Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">{totalRecords} dynamic records managed by Admin Panel.</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart data={adminAnalytics}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Area dataKey="revenue" fill="hsl(var(--primary) / 0.15)" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={3} type="monotone" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader>
                <CardTitle>System Activity</CardTitle>
                <p className="text-sm text-muted-foreground">Users, events, and security signals.</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={adminAnalytics}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Bar dataKey="users" fill="hsl(var(--primary))" name="Users" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="securityEvents" fill="rgb(244 63 94)" name="Security Events" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "backup" && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
              <p className="text-sm text-muted-foreground">Export or restore Admin Panel state including modules, roles, settings, and logs.</p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <button className="rounded-lg border bg-background/65 p-6 text-left transition-all hover:-translate-y-1 hover:border-primary/40" onClick={exportBackup} type="button">
                <Download className="mb-4 h-6 w-6 text-primary" />
                <p className="font-semibold">Export Backup</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Download a complete JSON snapshot of the current admin-managed state.</p>
              </button>
              <button className="rounded-lg border bg-background/65 p-6 text-left transition-all hover:-translate-y-1 hover:border-primary/40" onClick={() => fileInputRef.current?.click()} type="button">
                <RotateCcw className="mb-4 h-6 w-6 text-primary" />
                <p className="font-semibold">Restore Backup</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{restoreStatus}</p>
              </button>
              <input
                accept="application/json"
                className="hidden"
                onChange={(event) => restoreBackup(event.target.files?.[0])}
                ref={fileInputRef}
                type="file"
              />
              <div className="rounded-lg border bg-background/65 p-6 md:col-span-2">
                <UploadCloud className="mb-4 h-6 w-6 text-primary" />
                <p className="font-semibold">Production Note</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This frontend control is API-ready. In production, backup and restore should call protected backend endpoints with admin-only RBAC and immutable audit logs.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && <SettingsPanel groups={settings} onChange={updateSetting} />}
      </div>

      {editingRecord && (
        <AdminRecordModal
          module={activeModule}
          onClose={() => setEditingRecord(null)}
          onSubmit={saveRecord}
          record={editingRecord}
        />
      )}
    </main>
  );
}
