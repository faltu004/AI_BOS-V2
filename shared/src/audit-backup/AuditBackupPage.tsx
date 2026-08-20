import { AlertTriangle, Database, Download, FileText, HardDrive, History, Play, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { cn } from "@shared/lib/utils";
import { formatDateTime } from "@shared/lib/utils-helpers";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { useConfirm } from "@shared/ui/confirm-dialog-context";
import { EmptyState } from "@shared/ui/empty-state";
import { FilterBar } from "@shared/ui/filter-bar";
import { useToast } from "@shared/ui/toast-context";
import {
 fetchAuditLogs,
 fetchBackupHistory,
 fetchBackupSchedule,
 restoreBackup,
 runBackup,
 updateBackupSchedule,
} from "./audit-backup.api";
import {
 auditCategories,
 backupTypes,
 type AuditCategory,
 type AuditLogEntry,
 type BackupRecord,
 type BackupSchedule,
 type BackupType,
} from "./audit-backup.schema";

const backupTypeLabels: Record<BackupType, string> = {
 database: "Database",
 documents: "Documents",
 full: "Full Backup",
};

const statusStyles: Record<string, string> = {
 completed: "text-emerald-600 dark:text-emerald-400",
 in_progress: "text-amber-600 dark:text-amber-400",
 failed: "text-rose-600 dark:text-rose-400",
};

function formatBytes(bytes?: number) {
 if (!bytes) return "—";
 if (bytes < 1024) return `${bytes} B`;
 if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
 return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AuditBackupPage() {
 const { toast } = useToast();
 const { confirm } = useConfirm();
 const session = useMemo(() => getStoredAuthSession(), []);
 const token = session?.accessToken;
 const apiBaseUrl = getApiBaseUrl();

 const [tab, setTab] = useState<"audit" | "backup">("audit");

 const [logs, setLogs] = useState<AuditLogEntry[]>([]);
 const [search, setSearch] = useState("");
 const [categoryFilter, setCategoryFilter] = useState("");
 const [loadingLogs, setLoadingLogs] = useState(true);

 const [history, setHistory] = useState<BackupRecord[]>([]);
 const [schedule, setSchedule] = useState<BackupSchedule[]>([]);
 const [running, setRunning] = useState<BackupType | null>(null);

 function loadLogs() {
 if (!token) return;
 setLoadingLogs(true);
 fetchAuditLogs({ category: (categoryFilter || undefined) as AuditCategory | undefined, search: search || undefined }, token)
 .then((result) => setLogs(result.items))
 .catch((error: Error) => toast({ title: "Could not load audit logs", description: error.message, type: "error" }))
 .finally(() => setLoadingLogs(false));
 }

 useEffect(loadLogs, [token, categoryFilter]);

 function loadBackupData() {
 if (!token) return;
 fetchBackupHistory(token).then(setHistory).catch(() => undefined);
 fetchBackupSchedule(token).then(setSchedule).catch(() => undefined);
 }

 useEffect(loadBackupData, [token]);

 async function handleExportCsv() {
 if (!token) return;
 try {
 const params = new URLSearchParams();
 if (categoryFilter) params.set("category", categoryFilter);
 if (search) params.set("search", search);
 const response = await fetch(`${apiBaseUrl}/audit/logs/export?${params.toString()}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 if (!response.ok) throw new Error(`Export failed (${response.status})`);
 const blob = await response.blob();
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = "audit-log.csv";
 link.click();
 URL.revokeObjectURL(url);
 } catch (error) {
 toast({ title: "Export failed", description: (error as Error).message, type: "error" });
 }
 }

 async function handleRunBackup(type: BackupType) {
 if (!token) return;
 setRunning(type);
 try {
 await runBackup(type, token);
 toast({ title: `${backupTypeLabels[type]} backup completed`, type: "success" });
 loadBackupData();
 } catch (error) {
 toast({ title: "Backup failed", description: (error as Error).message, type: "error" });
 } finally {
 setRunning(null);
 }
 }

 async function handleRestore(record: BackupRecord) {
 const confirmed = await confirm({
 title: `Restore ${backupTypeLabels[record.type]} backup?`,
 description: "This overwrites current data with the contents of this backup. This cannot be undone.",
 confirmLabel: "Restore",
 tone: "danger",
 });
 if (!confirmed || !token) return;

 try {
 const result = await restoreBackup(record._id, token);
 toast({ title: "Restore completed", description: result.summary, type: "success" });
 loadBackupData();
 } catch (error) {
 toast({ title: "Restore failed", description: (error as Error).message, type: "error" });
 }
 }

 async function handleScheduleChange(type: BackupType, input: { isEnabled?: boolean; frequency?: "daily" | "weekly" }) {
 if (!token) return;
 await updateBackupSchedule(type, input, token).catch((error: Error) =>
 toast({ title: "Could not update schedule", description: error.message, type: "error" }),
 );
 loadBackupData();
 }

 if (!token) {
 return <div className="p-6 text-sm text-muted-foreground">Sign in to view audit logs and backups.</div>;
 }

 return (
 <div className="space-y-6 p-4 lg:p-6">
 <div>
 <p className="text-sm font-semibold text-primary">Audit & Backup</p>
 <h1 className="text-2xl font-bold">System activity and data protection</h1>
 <p className="text-sm text-muted-foreground">Search the audit trail and manage encrypted backups.</p>
 </div>

 <div className="flex gap-1 border-b">
 {(["audit", "backup"] as const).map((item) => (
 <button
 key={item}
 type="button"
 onClick={() => setTab(item)}
 className={cn(
 "border-b-2 px-4 py-2 text-sm font-semibold capitalize transition-colors",
 tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
 )}
 >
 {item === "audit" ? "Audit Logs" : "Backup"}
 </button>
 ))}
 </div>

 {tab === "audit" && (
 <div className="space-y-4">
 <FilterBar
 search={search}
 onSearchChange={setSearch}
 placeholder="Search path, actor, resource..."
 filters={
 <select
 value={categoryFilter}
 onChange={(event) => setCategoryFilter(event.target.value)}
 className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
 >
 <option value="">All categories</option>
 {auditCategories.map((category) => (
 <option key={category} value={category}>
 {category.replace("_", " ")}
 </option>
 ))}
 </select>
 }
 actions={
 <div className="flex gap-2">
 <Button variant="outline" type="button" onClick={loadLogs}>
 Search
 </Button>
 <Button variant="outline" type="button" onClick={handleExportCsv}>
 <Download className="h-4 w-4" />
 Export CSV
 </Button>
 </div>
 }
 />

 {loadingLogs ? (
 <p className="text-sm text-muted-foreground">Loading…</p>
 ) : logs.length === 0 ? (
 <EmptyState icon={FileText} title="No audit entries" description="Activity will appear here automatically as the system is used." />
 ) : (
 <Card className="overflow-x-auto">
 <table className="w-full min-w-[720px] text-sm">
 <thead className="border-b bg-muted text-left text-xs uppercase text-muted-foreground">
 <tr>
 <th className="p-3">Time</th>
 <th className="p-3">Actor</th>
 <th className="p-3">Category</th>
 <th className="p-3">Method</th>
 <th className="p-3">Path</th>
 <th className="p-3">Status</th>
 </tr>
 </thead>
 <tbody>
 {logs.map((log) => (
 <tr key={log._id} className="border-b last:border-0">
 <td className="p-3 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</td>
 <td className="p-3">{log.actorEmail ?? "—"}</td>
 <td className="p-3 capitalize">{log.category.replace("_", " ")}</td>
 <td className="p-3 font-mono text-xs">{log.method}</td>
 <td className="p-3 font-mono text-xs">{log.path}</td>
 <td className={cn("p-3 font-semibold", log.success ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
 {log.statusCode}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </Card>
 )}
 </div>
 )}

 {tab === "backup" && (
 <div className="space-y-6">
 <div>
 <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Run &amp; schedule</h2>
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 {backupTypes.map((type) => {
 const sched = schedule.find((item) => item.type === type);
 return (
 <Card key={type}>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 {type === "database" ? <Database className="h-4 w-4 text-primary" /> : <HardDrive className="h-4 w-4 text-primary" />}
 {backupTypeLabels[type]}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <Button size="sm" type="button" disabled={running === type} onClick={() => handleRunBackup(type)}>
 <Play className="h-3.5 w-3.5" />
 Run now
 </Button>
 <label className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 text-xs">
 <span>Auto backup</span>
 <input
 type="checkbox"
 className="h-4 w-4 accent-primary"
 checked={sched?.isEnabled ?? false}
 onChange={(event) => handleScheduleChange(type, { isEnabled: event.target.checked })}
 />
 </label>
 <select
 className="h-8 w-full rounded-md border bg-background px-2 text-xs"
 value={sched?.frequency ?? "daily"}
 onChange={(event) => handleScheduleChange(type, { frequency: event.target.value as "daily" | "weekly" })}
 >
 <option value="daily">Daily</option>
 <option value="weekly">Weekly</option>
 </select>
 </CardContent>
 </Card>
 );
 })}
 </div>
 </div>

 <div>
 <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
 <History className="h-4 w-4" />
 Backup history
 </h2>
 {history.length === 0 ? (
 <EmptyState icon={Save} title="No backups yet" description="Run a backup above to see it here." />
 ) : (
 <div className="space-y-2">
 {history.map((record) => (
 <Card key={record._id} className="flex items-center justify-between gap-4 p-4">
 <div>
 <p className="font-semibold">
 {backupTypeLabels[record.type]}
 <span className={cn("ml-2 text-xs font-semibold capitalize", statusStyles[record.status])}>{record.status}</span>
 </p>
 <p className="text-xs text-muted-foreground">
 {formatBytes(record.fileSize)} · {record.isEncrypted ? "Encrypted" : "Not encrypted"} · {record.storageLocation} ·{" "}
 {formatDateTime(record.startedAt)}
 </p>
 {record.errorMessage && (
 <p className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
 <AlertTriangle className="h-3 w-3" /> {record.errorMessage}
 </p>
 )}
 </div>
 {record.status === "completed" && (
 <Button size="sm" variant="outline" type="button" onClick={() => handleRestore(record)}>
 <RefreshCw className="h-3.5 w-3.5" />
 Restore
 </Button>
 )}
 </Card>
 ))}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
