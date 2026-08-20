import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { formatDateTime, formatDuration } from "@shared/lib/utils-helpers";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { ExportMenu } from "@shared/features/analytics/components/ExportMenu";
import { HealthScoreGauge } from "@shared/features/analytics/components/HealthScoreGauge";
import { ComboChart } from "@shared/features/analytics/components/PredictionChart";
import { StatCard } from "@shared/ui/stat-card";
import type { BusinessHealthScore } from "@shared/features/analytics/ai-analytics.types";
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Cpu, Database, GitBranch, HardDrive, RefreshCw, Server, ShieldAlert } from "lucide-react";
import { ManagedDevicesPanel } from "./ManagedDevicesPanel";
import {
 acknowledgeMonitoringAlert,
 fetchAgentUpdateOperationalStatus,
 type AgentUpdateOperationalStatus,
} from "./monitoring.api";

type Category = "overview" | "application" | "server" | "database" | "api" | "ai" | "business";

type Alert = {
 _id: string;
 severity: "info" | "warning" | "error" | "critical";
 category: Category;
 title: string;
 description: string;
 source: string;
 createdAt: string;
 acknowledgedAt?: string;
 acknowledgedByName?: string;
};

type Overview = {
 updatedAt: string;
 healthScore: number;
 application: { status: string; uptimeSeconds: number; errorRate: number; responseTimeMs: number; requestsPerMinute: number };
 server: { status: string; cpuUsagePercent: number; memoryUsagePercent: number; diskUsagePercent: number; activeConnections: number };
 database: { status: string; connectionPool: number; queryLatencyMs: number; replicationLagMs: number; storageUsedPercent: number };
 api: { status: string; p50Ms: number; p95Ms: number; p99Ms: number; errorRate: number };
 ai: { status: string; avgResponseTimeMs: number; queueDepth: number; modelLatencyMs: number; lastHealthCheck: string };
 backgroundJobs: { total: number; running: number; failed: number; pending: number; nextRunAt: string };
 queueStatus: { name: string; depth: number; consumerCount: number; status: string }[];
 business: { healthScore: number; dailyActiveUsers: number; conversionRate: number; revenueToday: number };
};

const categories = [
 { key: "overview", label: "Overview", icon: BarChart3 },
 { key: "application", label: "Application", icon: Activity },
 { key: "server", label: "Server", icon: Server },
 { key: "database", label: "Database", icon: Database },
 { key: "api", label: "API", icon: GitBranch },
 { key: "ai", label: "AI", icon: ShieldAlert },
 { key: "business", label: "Business", icon: BarChart3 },
] as const;

function clampScore(value: number): number {
 return Math.max(0, Math.min(100, Math.round(value)));
}

function buildHealthData(overview: Overview): BusinessHealthScore {
 const overall = overview.healthScore;
 const category = overall >= 85 ? "excellent" : overall >= 70 ? "good" : overall >= 50 ? "warning" : "critical";
 const applicationScore = clampScore(100 - overview.application.errorRate * 10 - overview.application.responseTimeMs / 50);
 const infrastructureScore = clampScore(100 - Math.max(overview.server.cpuUsagePercent, overview.server.memoryUsagePercent, overview.server.diskUsagePercent));
 const databaseScore = overview.database.status === "unavailable" ? 0 : clampScore(100 - overview.database.replicationLagMs * 2);
 const aiScore = overview.ai.status === "unavailable" ? 0 : clampScore(100 - overview.ai.avgResponseTimeMs / 25);

 return {
 overall,
 category,
 summary: `System health is ${category}. Scores are derived from live monitoring data that has been reported by managed devices.`,
 subScores: [
 { label: "Application", score: applicationScore, maxScore: 100, trend: "stable", severity: applicationScore < 50 ? "danger" : "success" },
 { label: "Infrastructure", score: infrastructureScore, maxScore: 100, trend: overview.server.cpuUsagePercent > 60 ? "down" : "stable", severity: infrastructureScore < 50 ? "danger" : "success" },
 { label: "Database", score: databaseScore, maxScore: 100, trend: "stable", severity: databaseScore === 0 ? "danger" : "success" },
 { label: "AI Layer", score: aiScore, maxScore: 100, trend: "stable", severity: aiScore === 0 ? "danger" : "success" },
 ],
 };
}

function buildCurrentServerSeries(overview: Overview) {
 return [
 { label: "Now", cpu: overview.server.cpuUsagePercent, memory: overview.server.memoryUsagePercent },
 ];
}

export function MonitoringDashboardPage() {
 const session = getStoredAuthSession();
 const token = session?.accessToken;
 const baseUrl = getApiBaseUrl();

 const [category, setCategory] = useState<Category>("overview");
 const [overview, setOverview] = useState<Overview | null>(null);
 const [alerts, setAlerts] = useState<Alert[]>([]);
 const [loading, setLoading] = useState(false);
 const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
 const [updateStatus, setUpdateStatus] = useState<AgentUpdateOperationalStatus | null>(null);

 const loadOverview = useCallback(async () => {
 if (!token) return;
 setLoading(true);
 try {
 const response = await fetch(`${baseUrl}/monitoring/overview?category=${category}`, { headers: { Authorization: `Bearer ${token}` } });
 if (!response.ok) throw new Error("Failed to load overview");
 const payload = (await response.json()) as { success: boolean; data: Overview };
 setOverview(payload.data);
 } catch (error) {
 console.error(error);
 } finally {
 setLoading(false);
 }
 }, [baseUrl, category, token]);

 const loadAlerts = useCallback(async () => {
 if (!token) return;
 try {
 const response = await fetch(`${baseUrl}/monitoring/alerts`, { headers: { Authorization: `Bearer ${token}` } });
 if (!response.ok) throw new Error("Failed to load alerts");
 const payload = (await response.json()) as { success: boolean; data: Alert[] };
 setAlerts(payload.data);
 } catch (error) {
 console.error(error);
 }
 }, [baseUrl, token]);

 const loadUpdateStatus = useCallback(async () => {
 try {
 const status = await fetchAgentUpdateOperationalStatus(token);
 setUpdateStatus(status);
 } catch (error) {
 console.error(error);
 }
 }, [token]);

 useEffect(() => {
 void loadOverview();
 void loadAlerts();
 void loadUpdateStatus();
 }, [loadOverview, loadAlerts, loadUpdateStatus]);

 async function handleAcknowledge(alertId: string) {
 setAcknowledgingId(alertId);
 try {
 const result = await acknowledgeMonitoringAlert(alertId, token);
 setAlerts((current) =>
 current.map((alert) =>
 alert._id === alertId
 ? { ...alert, acknowledgedAt: result.acknowledgedAt, acknowledgedByName: result.acknowledgedByName }
 : alert,
 ),
 );
 } catch (error) {
 console.error(error);
 } finally {
 setAcknowledgingId(null);
 }
 }

 const recentAlerts = useMemo(() => alerts.slice(0, 6), [alerts]);

 return (
 <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <p className="text-sm font-semibold text-primary">Enterprise Monitoring</p>
 <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
 <p className="text-sm text-muted-foreground">Health, performance, alerts, and business KPIs in one view.</p>
 </div>
 <div className="flex items-center gap-2">
 <Button onClick={() => void loadOverview()} size="sm" type="button" variant="outline">
 <RefreshCw className="mr-2 h-4 w-4" />
 Refresh
 </Button>
 <ExportMenu onExportPDF={async () => console.log("pdf")} onExportCSV={async () => console.log("csv")} />
 </div>
 </div>

 <div className="flex gap-2 overflow-x-auto pb-1">
 {categories.map((item) => {
 const Icon = item.icon;
 const isActive = category === item.key;
 return (
 <Button key={item.key} onClick={() => setCategory(item.key)} size="sm" type="button" variant={isActive ? "default" : "outline"}>
 <Icon className="mr-2 h-4 w-4" />
 {item.label}
 </Button>
 );
 })}
 </div>

 {category === "overview" && (
  <ManagedDevicesPanel token={token} />
)}
{category === "overview" && overview && (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <StatCard label="Health Score" value={overview.healthScore} icon={ShieldAlert} />
 <StatCard label="Uptime" value={formatDuration(overview.application.uptimeSeconds / 3600)} icon={Activity} />
 <StatCard label="AI Response" value={`${overview.ai.avgResponseTimeMs}ms`} icon={ShieldAlert} />
 <StatCard label="Revenue Today" value={`$${overview.business.revenueToday.toLocaleString()}`} icon={BarChart3} />
 </div>
 )}

 {category === "server" && overview && (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <StatCard label="CPU" value={`${overview.server.cpuUsagePercent}%`} icon={Cpu} />
 <StatCard label="Memory" value={`${overview.server.memoryUsagePercent}%`} icon={HardDrive} />
 <StatCard label="Disk" value={`${overview.server.diskUsagePercent}%`} icon={HardDrive} />
 <StatCard label="Connections" value={overview.server.activeConnections} icon={Server} />
 </div>
 )}

 {category === "database" && overview && (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <StatCard label="Pool" value={overview.database.connectionPool} icon={Database} />
 <StatCard label="Query Latency" value={`${overview.database.queryLatencyMs}ms`} icon={Activity} />
 <StatCard label="Replication Lag" value={`${overview.database.replicationLagMs}ms`} icon={RefreshCw} />
 <StatCard label="Storage" value={`${overview.database.storageUsedPercent}%`} icon={HardDrive} />
 </div>
 )}

 {category === "api" && overview && (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <StatCard label="P50" value={`${overview.api.p50Ms}ms`} icon={Activity} />
 <StatCard label="P95" value={`${overview.api.p95Ms}ms`} icon={AlertTriangle} />
 <StatCard label="P99" value={`${overview.api.p99Ms}ms`} icon={AlertTriangle} />
 <StatCard label="Error Rate" value={`${overview.api.errorRate}%`} icon={ShieldAlert} />
 </div>
 )}

 {category === "ai" && overview && (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <StatCard label="Avg Response" value={`${overview.ai.avgResponseTimeMs}ms`} icon={ShieldAlert} />
 <StatCard label="Queue Depth" value={overview.ai.queueDepth} icon={Activity} />
 <StatCard label="Model Latency" value={`${overview.ai.modelLatencyMs}ms`} icon={Cpu} />
 <StatCard label="Status" value={overview.ai.status} icon={ShieldAlert} />
 </div>
 )}

 {category === "business" && overview && (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <StatCard label="Daily Active" value={overview.business.dailyActiveUsers} icon={Activity} />
 <StatCard label="Conversion" value={`${overview.business.conversionRate}%`} icon={BarChart3} />
 <StatCard label="Revenue Today" value={`$${overview.business.revenueToday.toLocaleString()}`} icon={BarChart3} />
 <StatCard label="Health" value={overview.business.healthScore} icon={ShieldAlert} />
 </div>
 )}

 <div className="grid gap-4 lg:grid-cols-3">
 <Card className="glass lg:col-span-2">
 <CardHeader>
 <CardTitle>Realtime Trends</CardTitle>
 </CardHeader>
 <CardContent>
 {overview ? (
 <ComboChart
 data={buildCurrentServerSeries(overview)}
 xKey="label"
 bars={[{ key: "cpu", name: "CPU %", color: "rgb(16 185 129)" }]}
 lines={[{ key: "memory", name: "Memory %", color: "rgb(59 130 246)" }]}
 />
 ) : (
 <p className="text-sm text-muted-foreground">No data</p>
 )}
 </CardContent>
 </Card>

 <Card className="glass">
 <CardHeader>
 <CardTitle>Business Health</CardTitle>
 </CardHeader>
 <CardContent>
 {overview ? (
 <HealthScoreGauge data={buildHealthData(overview)} />
 ) : (
 <p className="text-sm text-muted-foreground">Loading health score...</p>
 )}
 </CardContent>
 </Card>
 </div>

 <Card className="glass">
 <CardHeader>
 <CardTitle>Alerts & Events</CardTitle>
 </CardHeader>
 <CardContent>
 {recentAlerts.length === 0 ? (
 <p className="text-sm text-muted-foreground">No active alerts.</p>
 ) : (
 <div className="space-y-3">
 {recentAlerts.map((alert) => {
 const severityStyles = {
 critical: "border-rose-500/40 text-rose-600 dark:text-rose-400",
 error: "border-orange-500/40 text-orange-600 dark:text-orange-400",
 warning: "border-amber-500/40 text-amber-600 dark:text-amber-400",
 info: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
 }[alert.severity];

 return (
 <div key={alert._id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold">{alert.title}</p>
 <p className="text-xs text-muted-foreground">{alert.description}</p>
 <p className="text-xs text-muted-foreground">
 {alert.source} · {formatDateTime(alert.createdAt)}
 </p>
 {alert.acknowledgedAt && (
 <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
 Acknowledged by {alert.acknowledgedByName ?? "unknown"} · {formatDateTime(alert.acknowledgedAt)}
 </p>
 )}
 </div>
 <div className="flex flex-col items-end gap-2">
 <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityStyles}`}>
 {alert.severity}
 </span>
 {!alert.acknowledgedAt && (
 <Button
 disabled={acknowledgingId === alert._id}
 onClick={() => void handleAcknowledge(alert._id)}
 size="sm"
 type="button"
 variant="outline"
 >
 <CheckCircle2 className="mr-2 h-4 w-4" />
 {acknowledgingId === alert._id ? "Saving..." : "Acknowledge"}
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </CardContent>
 </Card>

 {updateStatus && (
 <Card className="glass">
 <CardHeader>
 <CardTitle>Agent Auto-Update</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2 text-sm">
 <p>
 Approved release:{" "}
 {updateStatus.releaseConfigured ? (
 <span className="font-semibold">
 {updateStatus.approvedVersion}
 {updateStatus.mandatory ? " (mandatory)" : ""}
 </span>
 ) : (
 <span className="text-muted-foreground">Not configured</span>
 )}
 </p>
 <p className="text-xs text-muted-foreground">
 Activation is a per-device local setting ({updateStatus.activationEnvVarName}) and is
 safe/off by default. It is not visible to the backend and must be verified on each
 device individually before relying on automatic activation.
 </p>
 </CardContent>
 </Card>
 )}
 </div>
 );
}


