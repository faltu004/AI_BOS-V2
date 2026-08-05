import {
 AlertCircle,
 CheckCircle2,
 Clock,
 Link2,
 RefreshCw,
 Settings as SettingsIcon,
 Unlink,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { cn } from "@shared/lib/utils";
import { formatDateTime } from "@shared/lib/utils-helpers";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useToast } from "@shared/ui/toast-context";
import {
 disconnectIntegration,
 fetchIntegrationLogs,
 fetchIntegrations,
 fetchProviderConfigs,
 getConnectUrl,
 syncIntegration,
 testIntegrationConnection,
 updateIntegrationSettings,
 updateProviderConfig,
} from "./integration.api";
import { integrationCategories, type IntegrationCardData, type IntegrationFamily, type IntegrationLogEntry, type ProviderConfigStatus } from "./integration.schema";

const statusStyles: Record<IntegrationCardData["status"], string> = {
 connected: "text-emerald-600 dark:text-emerald-400",
 disconnected: "text-muted-foreground",
 error: "text-rose-600 dark:text-rose-400",
 connecting: "text-amber-600 dark:text-amber-400",
};

const familyLabels: Record<IntegrationFamily, string> = {
 google: "Google",
 microsoft: "Microsoft",
 slack: "Slack",
 zoom: "Zoom",
 github: "GitHub",
 gitlab: "GitLab",
 atlassian: "Atlassian (Jira)",
 dropbox: "Dropbox",
 whatsapp: "WhatsApp Business",
};

function IntegrationCard({
 integration,
 logs,
 onConnect,
 onDisconnect,
 onSync,
 onTest,
 onFrequencyChange,
}: {
 integration: IntegrationCardData;
 logs: IntegrationLogEntry[] | undefined;
 onConnect: (key: string) => void;
 onDisconnect: (key: string) => void;
 onSync: (key: string) => void;
 onTest: (key: string) => void;
 onFrequencyChange: (key: string, frequency: string) => void;
}) {
 const [showLogs, setShowLogs] = useState(false);
 const [busy, setBusy] = useState(false);

 const wrap = (fn: () => void) => {
 setBusy(true);
 try {
 fn();
 } finally {
 setBusy(false);
 }
 };

 return (
 <Card className="glass">
 <CardHeader className="flex flex-row items-start justify-between gap-4">
 <div>
 <CardTitle className="text-base">{integration.name}</CardTitle>
 <p className="text-sm text-muted-foreground">{integration.description}</p>
 </div>
 <span className={cn("text-xs font-semibold capitalize", statusStyles[integration.status])}>{integration.status}</span>
 </CardHeader>
 <CardContent className="space-y-3">
 {integration.authType === "future_ready" ? (
 <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">Coming soon</p>
 ) : (
 <>
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold">Sync:</span>
 <select
 className="h-8 rounded-md border bg-background px-2 text-xs"
 disabled={integration.status !== "connected"}
 onChange={(event) => onFrequencyChange(integration.key, event.target.value)}
 value={integration.syncFrequency}
 >
 <option value="realtime">Realtime</option>
 <option value="hourly">Hourly</option>
 <option value="daily">Daily</option>
 <option value="weekly">Weekly</option>
 <option value="manual">Manual</option>
 </select>
 </div>

 {integration.lastSyncSummary && (
 <p className="text-xs text-muted-foreground">
 Last sync: {integration.lastSyncSummary} {integration.lastSyncAt ? `(${formatDateTime(integration.lastSyncAt)})` : ""}
 </p>
 )}

 <div className="flex flex-wrap gap-2">
 {integration.status === "connected" ? (
 <Button disabled={busy} onClick={() => wrap(() => onDisconnect(integration.key))} size="sm" type="button" variant="outline">
 <Unlink className="h-3.5 w-3.5" />
 Disconnect
 </Button>
 ) : (
 <Button disabled={busy} onClick={() => wrap(() => onConnect(integration.key))} size="sm" type="button">
 <Link2 className="h-3.5 w-3.5" />
 Connect
 </Button>
 )}
 {integration.status === "connected" && (
 <>
 <Button disabled={busy} onClick={() => wrap(() => onSync(integration.key))} size="sm" type="button" variant="outline">
 <RefreshCw className="h-3.5 w-3.5" />
 Sync
 </Button>
 <Button disabled={busy} onClick={() => wrap(() => onTest(integration.key))} size="sm" type="button" variant="outline">
 Test connection
 </Button>
 </>
 )}
 </div>

 {logs && logs.length > 0 && (
 <div>
 <button className="text-xs font-semibold text-primary hover:underline" onClick={() => setShowLogs((current) => !current)} type="button">
 {showLogs ? "Hide" : "Show"} logs ({logs.length})
 </button>
 {showLogs && (
 <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-background p-2">
 {logs.map((log) => (
 <div className="flex items-start gap-1.5 text-xs" key={log._id}>
 {log.status === "success" ? (
 <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
 ) : log.status === "error" ? (
 <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
 ) : (
 <Clock className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
 )}
 <span>
 <span className="font-semibold">{log.action}</span> — {log.message}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </>
 )}
 </CardContent>
 </Card>
 );
}

export function IntegrationsCenterPage() {
 const { toast } = useToast();
 const session = useMemo(() => getStoredAuthSession(), []);
 const token = session?.accessToken;
 const canManage = ["Owner", "Administrator", "Developer"].includes(session?.user.role ?? "");

 const [tab, setTab] = useState<"integrations" | "settings">("integrations");
 const [integrations, setIntegrations] = useState<IntegrationCardData[]>([]);
 const [logsByKey, setLogsByKey] = useState<Record<string, IntegrationLogEntry[]>>({});
 const [loading, setLoading] = useState(true);
 const [providerConfigs, setProviderConfigs] = useState<ProviderConfigStatus[]>([]);
 const [draftCredentials, setDraftCredentials] = useState<Record<string, { clientId: string; clientSecret: string }>>({});

 function loadIntegrations() {
 if (!token) {
 setLoading(false);
 return;
 }
 setLoading(true);
 fetchIntegrations(token)
 .then(async (list) => {
 setIntegrations(list);
 const connected = list.filter((item) => item.status === "connected");
 const logEntries = await Promise.all(connected.map((item) => fetchIntegrationLogs(item.key, token).catch(() => [])));
 setLogsByKey(Object.fromEntries(connected.map((item, index) => [item.key, logEntries[index]])));
 })
 .catch((error: Error) => toast({ title: "Could not load integrations", description: error.message, type: "error" }))
 .finally(() => setLoading(false));
 }

 useEffect(loadIntegrations, [token]);

 useEffect(() => {
 if (!token || tab !== "settings" || !canManage) return;
 fetchProviderConfigs(token).then(setProviderConfigs).catch(() => undefined);
 }, [token, tab, canManage]);

 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const connected = params.get("connected");
 const errored = params.get("error");
 if (connected) toast({ title: `${connected} connected`, type: "success" });
 if (errored) toast({ title: `Could not connect ${errored}`, type: "error" });
 if (connected || errored) window.history.replaceState({}, "", window.location.pathname);
 }, [toast]);

 async function handleConnect(key: string) {
 if (!token) return;
 try {
 const { authorizationUrl } = await getConnectUrl(key, token);
 window.location.href = authorizationUrl;
 } catch (error) {
 toast({ title: "Could not start connection", description: (error as Error).message, type: "error" });
 }
 }

 async function handleDisconnect(key: string) {
 if (!token) return;
 await disconnectIntegration(key, token).catch((error: Error) => toast({ title: "Disconnect failed", description: error.message, type: "error" }));
 loadIntegrations();
 }

 async function handleSync(key: string) {
 if (!token) return;
 try {
 const result = await syncIntegration(key, token);
 toast({ title: "Sync completed", description: result.summary, type: result.itemsSynced > 0 ? "success" : "info" });
 loadIntegrations();
 } catch (error) {
 toast({ title: "Sync failed", description: (error as Error).message, type: "error" });
 }
 }

 async function handleTest(key: string) {
 if (!token) return;
 try {
 const result = await testIntegrationConnection(key, token);
 toast({ title: result.ok ? "Connection healthy" : "Connection issue", description: result.detail, type: result.ok ? "success" : "warning" });
 } catch (error) {
 toast({ title: "Test failed", description: (error as Error).message, type: "error" });
 }
 }

 async function handleFrequencyChange(key: string, syncFrequency: string) {
 if (!token) return;
 await updateIntegrationSettings(key, { syncFrequency, autoSyncEnabled: syncFrequency !== "manual" }, token).catch(() => undefined);
 loadIntegrations();
 }

 async function handleSaveProvider(family: IntegrationFamily) {
 if (!token) return;
 const draft = draftCredentials[family];
 if (!draft?.clientId || !draft?.clientSecret) {
 toast({ title: "Client ID and Secret are both required", type: "error" });
 return;
 }
 try {
 const updated = await updateProviderConfig(family, { clientId: draft.clientId, clientSecret: draft.clientSecret, isEnabled: true }, token);
 setProviderConfigs(updated);
 setDraftCredentials((current) => ({ ...current, [family]: { clientId: "", clientSecret: "" } }));
 toast({ title: `${familyLabels[family]} configured`, type: "success" });
 } catch (error) {
 toast({ title: "Could not save credentials", description: (error as Error).message, type: "error" });
 }
 }

 if (!token) {
 return <div className="p-6 text-sm text-muted-foreground">Sign in to manage integrations.</div>;
 }

 return (
 <div className="space-y-6 p-4 lg:p-6">
 <div>
 <p className="text-sm font-semibold text-primary">Integrations Center</p>
 <h1 className="text-2xl font-bold">Connect your tools</h1>
 <p className="text-sm text-muted-foreground">Calendars, email, storage, chat, and developer tools — all in one place.</p>
 </div>

 <div className="flex gap-1 border-b">
 {(["integrations", ...(canManage ? (["settings"] as const) : [])] as const).map((item) => (
 <button
 className={cn(
 "border-b-2 px-4 py-2 text-sm font-semibold capitalize transition-colors",
 tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
 )}
 key={item}
 onClick={() => setTab(item)}
 type="button"
 >
 {item === "settings" ? "Admin Settings" : item}
 </button>
 ))}
 </div>

 {tab === "integrations" &&
 (loading ? (
 <p className="text-sm text-muted-foreground">Loading…</p>
 ) : (
 integrationCategories.map((category) => {
 const items = integrations.filter((item) => item.category === category);
 if (items.length === 0) return null;
 return (
 <div key={category}>
 <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{category}</h2>
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
 {items.map((integration) => (
 <IntegrationCard
 integration={integration}
 key={integration.key}
 logs={logsByKey[integration.key]}
 onConnect={handleConnect}
 onDisconnect={handleDisconnect}
 onFrequencyChange={handleFrequencyChange}
 onSync={handleSync}
 onTest={handleTest}
 />
 ))}
 </div>
 </div>
 );
 })
 ))}

 {tab === "settings" && canManage && (
 <div className="grid gap-4 md:grid-cols-2">
 {providerConfigs.map((config) => (
 <Card key={config.family}>
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="flex items-center gap-2 text-base">
 <SettingsIcon className="h-4 w-4 text-primary" />
 {familyLabels[config.family]}
 </CardTitle>
 <span className={cn("text-xs font-semibold", config.isConfigured ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
 {config.isConfigured ? "Configured" : "Not configured"}
 </span>
 </CardHeader>
 <CardContent className="space-y-3">
 {config.family === "whatsapp" ? (
 <p className="text-xs text-muted-foreground">Coming soon — no OAuth app required yet.</p>
 ) : (
 <>
 <div className="space-y-1">
 <Label>Client ID</Label>
 <Input
 onChange={(event) =>
 setDraftCredentials((current) => ({
 ...current,
 [config.family]: { clientId: event.target.value, clientSecret: current[config.family]?.clientSecret ?? "" },
 }))
 }
 placeholder="Client ID"
 value={draftCredentials[config.family]?.clientId ?? ""}
 />
 </div>
 <div className="space-y-1">
 <Label>Client Secret</Label>
 <Input
 onChange={(event) =>
 setDraftCredentials((current) => ({
 ...current,
 [config.family]: { clientId: current[config.family]?.clientId ?? "", clientSecret: event.target.value },
 }))
 }
 placeholder="Client Secret"
 type="password"
 value={draftCredentials[config.family]?.clientSecret ?? ""}
 />
 </div>
 <p className="text-xs text-muted-foreground">Redirect URI: {config.redirectUri}</p>
 <Button onClick={() => handleSaveProvider(config.family)} size="sm" type="button">
 Save credentials
 </Button>
 </>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}
