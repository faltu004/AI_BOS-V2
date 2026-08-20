import { ShieldCheck, ShieldAlert, ShieldX, Smartphone, History, KeyRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { formatDateTime } from "@shared/lib/utils-helpers";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { useToast } from "@shared/ui/toast-context";

type Severity = "low" | "medium" | "high" | "critical";

type SecuritySummary = {
 openCount: number;
 bySeverity: Record<Severity, number>;
 recent: Array<{
 _id: string;
 eventType: string;
 severity: Severity;
 description: string;
 createdAt: string;
 }>;
};

function severityIcon(severity: Severity) {
 switch (severity) {
 case "critical":
 case "high":
 return ShieldX;
 case "medium":
 return ShieldAlert;
 default:
 return ShieldCheck;
 }
}

function severityClass(severity: Severity) {
 switch (severity) {
 case "critical":
 return "text-rose-600 dark:text-rose-400";
 case "high":
 return "text-orange-600 dark:text-orange-400";
 case "medium":
 return "text-amber-600 dark:text-amber-400";
 default:
 return "text-emerald-600 dark:text-emerald-400";
 }
}

export function SecurityDashboardPage() {
 const { toast } = useToast();
 const session = getStoredAuthSession();
 const token = session?.accessToken;
 const baseUrl = getApiBaseUrl();

 const [summary, setSummary] = useState<SecuritySummary | null>(null);
 const [loading, setLoading] = useState(false);

 async function loadSummary() {
 if (!token) return;
 setLoading(true);
 try {
 const response = await fetch(`${baseUrl}/security`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 if (!response.ok) {
 const body = (await response.json().catch(() => null)) as { message?: string } | null;
 throw new Error(body?.message ?? "Failed to load security summary");
 }
 const result = (await response.json()) as { success: boolean; data: SecuritySummary };
 setSummary(result.data);
 } catch (error) {
 toast({ title: "Security dashboard unavailable", description: (error as Error).message, type: "error" });
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 let cancelled = false;
 const timer = setTimeout(async () => {
 if (!cancelled) {
 await loadSummary();
 }
 }, 0);

 return () => {
 cancelled = true;
 clearTimeout(timer);
 };
 }, [token]);

 const openIssues = useMemo<Record<Severity, number>>(() => summary?.bySeverity ?? ({} as Record<Severity, number>), [summary]);

 return (
 <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
 <div>
 <p className="text-sm font-semibold text-primary">Security Operations</p>
 <h1 className="text-2xl font-bold">Security Dashboard</h1>
 <p className="text-sm text-muted-foreground">
 Monitor authentication posture, suspicious activity, device trust, and open security issues.
 </p>
 </div>

 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {([
 { label: "Open Issues", value: summary?.openCount ?? 0, icon: ShieldAlert },
 { label: "Critical / High", value: (openIssues.critical ?? 0) + (openIssues.high ?? 0), icon: ShieldX },
 { label: "Devices", value: "—", icon: Smartphone },
 { label: "History", value: "—", icon: History },
 ]).map((item) => {
 const Icon = item.icon;
 return (
 <Card key={item.label} className="glass">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-sm">{item.label}</CardTitle>
 <Icon className="h-4 w-4 text-primary" />
 </CardHeader>
 <CardContent className="text-2xl font-bold">{item.value}</CardContent>
 </Card>
 );
 })}
 </div>

 <Card className="glass">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle>Recent Security Events</CardTitle>
 <Button onClick={loadSummary} size="sm" type="button" variant="outline">
 Refresh
 </Button>
 </CardHeader>
 <CardContent>
 {loading ? (
 <p className="text-sm text-muted-foreground">Loading…</p>
 ) : summary && summary.recent.length ? (
 <div className="space-y-3">
 {summary.recent.map((event) => {
 const Icon = severityIcon(event.severity);
 return (
 <div key={event._id} className="flex items-start gap-3 rounded-lg border p-3">
 <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${severityClass(event.severity)}`} />
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold">{event.description}</p>
 <p className="text-xs text-muted-foreground">
 {event.eventType} · {formatDateTime(event.createdAt)}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-sm text-muted-foreground">No recent security events.</p>
 )}
 </CardContent>
 </Card>

 <Card className="glass">
 <CardHeader>
 <CardTitle>Security Controls</CardTitle>
 </CardHeader>
 <CardContent className="grid gap-3 sm:grid-cols-3">
 {[
 { label: "Password Policy", icon: KeyRound, note: "Enforced on registration and change" },
 { label: "Login History", icon: History, note: "Available via security API" },
 { label: "Device Trust", icon: Smartphone, note: "Trusted device management enabled" },
 ].map((item) => {
 const Icon = item.icon;
 return (
 <div key={item.label} className="rounded-lg border p-4">
 <Icon className="mb-2 h-4 w-4 text-primary" />
 <p className="text-sm font-semibold">{item.label}</p>
 <p className="text-xs text-muted-foreground">{item.note}</p>
 </div>
 );
 })}
 </CardContent>
 </Card>
 </div>
 );
}
