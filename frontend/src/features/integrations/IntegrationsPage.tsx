import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  ContactRound,
  FileText,
  Globe,
  MessageSquare,
  MoreVertical,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Video,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm-dialog-context";
import { useToast } from "@/components/ui/toast-context";
import { seedIntegrationLogs, seedIntegrations } from "./integrations.data";
import type { Integration, IntegrationLog } from "./integrations.types";
import { integrationCategories } from "./integrations.types";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBase = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

function getStatusColor(status: string) {
  switch (status) {
    case "connected":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    case "disconnected":
      return "bg-muted text-muted-foreground";
    case "error":
      return "bg-red-500/10 text-red-600 dark:text-red-300";
    case "syncing":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-300";
    default:
      return "bg-primary/10 text-primary";
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "communication":
      return MessageSquare;
    case "crm":
      return ContactRound;
    case "finance":
      return WalletCards;
    case "productivity":
      return Settings2;
    case "storage":
      return FileText;
    case "ai":
      return Bot;
    default:
      return Globe;
  }
}

function IntegrationCard({ integration, onConnect, onDisconnect, onSync, onHealthCheck }: { integration: Integration; onConnect: () => void; onDisconnect: () => void; onSync: () => void; onHealthCheck: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const Icon = getCategoryIcon(integration.category);

  return (
    <Card className="glass h-full rounded-2xl bg-card/70 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <CardTitle className="text-base">{integration.name}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground capitalize">{integration.category}</p>
            </div>
          </div>
          <div className="relative">
            <Button aria-label="More options" onClick={() => setShowMenu((v) => !v)} size="icon" type="button" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border bg-background/95 p-1 shadow-lg backdrop-blur-xl">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted" onClick={() => { onSync(); setShowMenu(false); }} type="button"><RefreshCw className="h-4 w-4" />Sync</button>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted" onClick={() => { onHealthCheck(); setShowMenu(false); }} type="button"><ShieldCheck className="h-4 w-4" />Health</button>
                {integration.status === "connected" ? (
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted text-destructive" onClick={() => { onDisconnect(); setShowMenu(false); }} type="button"><Pause className="h-4 w-4" />Disconnect</button>
                ) : (
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted text-emerald-600" onClick={() => { onConnect(); setShowMenu(false); }} type="button"><Play className="h-4 w-4" />Connect</button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{integration.description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 font-semibold capitalize ${getStatusColor(integration.status)}`}>{integration.status}</span>
          {integration.lastSyncAt && <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">Last sync: {new Date(integration.lastSyncAt).toLocaleDateString()}</span>}
        </div>
        <div className="flex flex-wrap gap-2 opacity-90 transition-opacity hover:opacity-100">
          {integration.status === "connected" ? (
            <>
              <Button size="sm" variant="outline" onClick={onSync}><RefreshCw className="h-4 w-4" />Sync</Button>
              <Button size="sm" variant="outline" onClick={onHealthCheck}><ShieldCheck className="h-4 w-4" />Health</Button>
              <Button size="sm" variant="outline" onClick={onDisconnect}><Pause className="h-4 w-4" />Disconnect</Button>
            </>
          ) : (
            <Button size="sm" onClick={onConnect}><Play className="h-4 w-4" />Connect</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationLogs({ logs }: { logs: IntegrationLog[] }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log) => (
          <div className="flex items-start gap-3 rounded-xl border bg-background/65 p-4" key={log.id}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${log.status === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : log.status === "failed" ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300" : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300"}`}>
              {log.status === "success" ? <CheckCircle2 className="h-4 w-4" /> : log.status === "failed" ? <XCircle className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold capitalize">{log.action.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">{log.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ConnectModal({ integration, onClose, onConnect }: { integration: Integration; onClose: () => void; onConnect: (apiKey: string) => void }) {
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.div animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-lg border bg-background p-6 shadow-glass" initial={{ opacity: 0, scale: 0.96 }}>
        <h2 className="text-xl font-bold">Connect {integration.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter your API key to connect {integration.name}.</p>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" placeholder="Enter API key..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
            <Button onClick={() => onConnect(apiKey)} type="submit">Connect</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function IntegrationsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>(seedIntegrations);
  const [logs, setLogs] = useState<IntegrationLog[]>(seedIntegrationLogs);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [connecting, setConnecting] = useState<Integration | null>(null);

  const filteredIntegrations = useMemo(() => {
    return integrations
      .filter((integration) => {
        const searchText = `${integration.name} ${integration.description} ${integration.category}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .filter((integration) => category === "All" || integration.category === category);
  }, [category, integrations, search]);

  const connectIntegration = async (integration: Integration, apiKey: string) => {
    try {
      const response = await fetch(`${apiBase}/integrations/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: integration.id, apiKey }),
      });
      if (!response.ok) throw new Error("Connection failed");
      setIntegrations((current) => current.map((i) => i.id === integration.id ? { ...i, status: "connected" as const, connectedAt: new Date().toISOString(), lastSyncAt: new Date().toISOString() } : i));
      setLogs((current) => [{ id: `log-${Date.now()}`, integrationId: integration.id, action: "connect", status: "success", message: `Connected to ${integration.name}`, timestamp: new Date().toISOString() }, ...current]);
      toast({ title: "Integration connected", description: `${integration.name} is now connected.`, type: "success" });
    } catch {
      toast({ title: "Connection failed", description: "Check your API key and try again.", type: "error" });
    }
  };

  const disconnectIntegration = async (id: string) => {
    const accepted = await confirm({ title: "Disconnect integration?", description: "This will stop syncing data.", confirmLabel: "Disconnect", tone: "danger" });
    if (!accepted) return;
    try {
      await fetch(`${apiBase}/integrations/disconnect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ integrationId: id }) });
      setIntegrations((current) => current.map((i) => i.id === id ? { ...i, status: "disconnected" as const } : i));
      toast({ title: "Integration disconnected", type: "warning" });
    } catch {
      toast({ title: "Disconnect failed", type: "error" });
    }
  };

  const syncIntegration = async (id: string) => {
    try {
      await fetch(`${apiBase}/integrations/sync`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ integrationId: id }) });
      setIntegrations((current) => current.map((i) => i.id === id ? { ...i, status: "syncing" as const, lastSyncAt: new Date().toISOString() } : i));
      setTimeout(() => {
        setIntegrations((current) => current.map((i) => i.id === id ? { ...i, status: "connected" as const } : i));
        setLogs((current) => [{ id: `log-${Date.now()}`, integrationId: id, action: "sync", status: "success", message: "Sync completed", timestamp: new Date().toISOString() }, ...current]);
      }, 1500);
      toast({ title: "Sync started", description: "Syncing data...", type: "success" });
    } catch {
      toast({ title: "Sync failed", type: "error" });
    }
  };

  const healthCheck = async (id: string) => {
    try {
      const response = await fetch(`${apiBase}/integrations/health`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ integrationId: id }) });
      const data = await response.json();
      setLogs((current) => [{ id: `log-${Date.now()}`, integrationId: id, action: "health_check", status: data.success ? "success" : "failed", message: data.message || "Health check completed", timestamp: new Date().toISOString() }, ...current]);
      toast({ title: "Health check complete", description: data.message, type: data.success ? "success" : "error" });
    } catch {
      toast({ title: "Health check failed", type: "error" });
    }
  };

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Integrations</p>
            <h1 className="text-2xl font-bold">Third-Party Integrations</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="glass">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="mt-2 text-3xl font-bold">{integrations.length}</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Connected</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-300">{integrations.filter((i) => i.status === "connected").length}</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Errors</p>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-300">{integrations.filter((i) => i.status === "error").length}</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Disconnected</p>
              <p className="mt-2 text-3xl font-bold text-muted-foreground">{integrations.filter((i) => i.status === "disconnected").length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass">
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_160px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search integrations..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>All</option>
                {integrationCategories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {filteredIntegrations.length === 0 ? (
          <EmptyState description="No integrations match your search." icon={Globe} title="No integrations found" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={() => setConnecting(integration)}
                onDisconnect={() => disconnectIntegration(integration.id)}
                onHealthCheck={() => healthCheck(integration.id)}
                onSync={() => syncIntegration(integration.id)}
              />
            ))}
          </div>
        )}

        <IntegrationLogs logs={logs} />
      </div>

      {connecting && (
        <ConnectModal
          integration={connecting}
          onClose={() => setConnecting(null)}
          onConnect={(apiKey) => { void connectIntegration(connecting, apiKey); setConnecting(null); }}
        />
      )}
    </main>
  );
}
