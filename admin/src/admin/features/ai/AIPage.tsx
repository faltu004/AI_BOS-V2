import {
  Activity,
  Bot,
  Loader2,
  MonitorCog,
  RefreshCw,
  Send,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@shared/ui/button";
import {
  explainOpenAlert,
  fetchAIStatus,
  fetchAIWorkspaceContext,
  generateMonitoringSummary,
  getDeviceTroubleshooting,
  prioritizeOpenAlerts,
  runOperationalQuery,
  type AIHistoryMessage,
  type AIOperationResult,
  type AIStatus,
  type AIWorkspaceContext,
} from "./ai.api";

type ConversationMessage = AIHistoryMessage & {
  id: string;
  title?: string;
  sources?: string[];
};

function conversationMessage(
  role: ConversationMessage["role"],
  content: string,
  title?: string,
  sources?: string[],
): ConversationMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    title,
    sources,
  };
}

function providerLabel(provider: AIStatus["provider"]) {
  if (provider === "openai-compatible") return "OpenAI-compatible";
  if (provider === "ollama") return "Ollama";
  return "Not configured";
}

export function AIPage() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [context, setContext] = useState<AIWorkspaceContext | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [query, setQuery] = useState("");
  const [selectedAlert, setSelectedAlert] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [deviceQuestion, setDeviceQuestion] = useState("");
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoadingWorkspace(true);
    setError(null);
    try {
      const nextStatus = await fetchAIStatus();
      setStatus(nextStatus);
      const nextContext = await fetchAIWorkspaceContext();
      setContext(nextContext);
      setSelectedAlert((current) =>
        nextContext.catalog.alerts.some((alert) => alert.id === current) ? current : "",
      );
      setSelectedDevice((current) =>
        nextContext.catalog.devices.some((device) => device.deviceId === current) ? current : "",
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "AI workspace is unavailable.");
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activeOperation]);

  const configured = status?.configured ?? context?.provider.configured ?? false;
  const capabilities = context?.capabilities ?? status?.capabilities;
  const provider = context?.provider.provider ?? status?.provider ?? "disabled";
  const sourceLabel = useMemo(
    () => context?.sources.map((source) => source.replace(/_/g, " ")).join(", ") ?? "",
    [context?.sources],
  );

  async function runOperation(
    operation: string,
    label: string,
    action: () => Promise<AIOperationResult>,
  ) {
    if (!configured || activeOperation) return;
    setActiveOperation(operation);
    setError(null);
    setMessages((current) => [...current, conversationMessage("user", label)]);
    try {
      const result = await action();
      setMessages((current) => [
        ...current,
        conversationMessage("assistant", result.answer, label, result.sources),
      ]);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "AI request failed.");
    } finally {
      setActiveOperation(null);
    }
  }

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = query.trim();
    if (!message || !configured || activeOperation) return;

    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setQuery("");
    setActiveOperation("query");
    setError(null);
    setMessages((current) => [...current, conversationMessage("user", message)]);
    try {
      const result = await runOperationalQuery(message, history);
      setMessages((current) => [
        ...current,
        conversationMessage("assistant", result.answer, "Operational answer", result.sources),
      ]);
    } catch (queryError) {
      setError(queryError instanceof Error ? queryError.message : "AI request failed.");
    } finally {
      setActiveOperation(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Operations Intelligence</p>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={`rounded-md border px-2 py-1 font-semibold ${configured ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300" : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"}`}>
              {configured ? "Provider ready" : "Provider not configured"}
            </span>
            <span className="rounded-md border px-2 py-1">Read-only</span>
            {status ? <span>{providerLabel(provider)}{status.model ? ` / ${status.model}` : ""}</span> : null}
          </div>
        </div>
        <Button disabled={loadingWorkspace} onClick={() => void loadWorkspace()} size="sm" type="button" variant="outline">
          <RefreshCw className={loadingWorkspace ? "animate-spin" : ""} size={16} aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {!loadingWorkspace && !configured ? (
        <section className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">AI is not configured</h2>
            <p className="mt-1 text-sm opacity-80">
              {status?.reason ?? context?.provider.reason ?? "The backend AI provider is unavailable."}
            </p>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="text-primary" size={19} aria-hidden="true" />
              <h2 className="text-sm font-semibold">Operational Query</h2>
            </div>
            <span className="text-xs text-muted-foreground">{context?.role ?? "Owner / Administrator"}</span>
          </div>

          <div ref={conversationRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="grid h-full min-h-72 place-items-center text-center">
                <div className="max-w-md">
                  <Activity className="mx-auto mb-3 text-primary" size={28} aria-hidden="true" />
                  <p className="text-sm font-semibold">No AI analysis has been generated in this session.</p>
                  {sourceLabel ? <p className="mt-2 text-xs text-muted-foreground">Live sources: {sourceLabel}</p> : null}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
                  <div className={`max-w-[88%] rounded-md px-3.5 py-3 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "border bg-muted/45"}`}>
                    {message.title ? <p className="mb-1 text-xs font-semibold opacity-70">{message.title}</p> : null}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sources?.length ? (
                      <p className="mt-2 border-t pt-2 text-xs opacity-70">Sources: {message.sources.join(", ")}</p>
                    ) : null}
                  </div>
                </article>
              ))
            )}
            {activeOperation ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                Generating analysis from current backend records
              </div>
            ) : null}
          </div>

          <form className="border-t p-3" onSubmit={submitQuery}>
            <label className="sr-only" htmlFor="ai-operational-query">Operational query</label>
            <div className="flex items-end gap-2">
              <textarea
                className="min-h-11 flex-1 resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={!configured}
                id="ai-operational-query"
                maxLength={1500}
                placeholder="Ask an operational question"
                rows={2}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button aria-label="Send operational query" disabled={!configured || !query.trim() || Boolean(activeOperation)} size="icon" type="submit">
                <Send size={17} aria-hidden="true" />
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="text-primary" size={18} aria-hidden="true" />
              <h2 className="text-sm font-semibold">Monitoring Summary</h2>
            </div>
            <Button
              className="w-full"
              disabled={!configured || !capabilities?.monitoring || Boolean(activeOperation)}
              onClick={() => void runOperation("monitoring", "Monitoring summary", generateMonitoringSummary)}
              type="button"
              variant="outline"
            >
              Generate summary
            </Button>
          </section>

          <section className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="text-primary" size={18} aria-hidden="true" />
              <h2 className="text-sm font-semibold">Alert Analysis</h2>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full"
                disabled={!configured || !capabilities?.alertExplanations || !context?.catalog.alerts.length || Boolean(activeOperation)}
                onClick={() => void runOperation("prioritize", "Prioritize open alerts", prioritizeOpenAlerts)}
                type="button"
                variant="outline"
              >
                Prioritize open alerts
              </Button>
              <label className="block text-xs font-medium" htmlFor="ai-alert-select">Open alert</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                disabled={!capabilities?.alertExplanations}
                id="ai-alert-select"
                value={selectedAlert}
                onChange={(event) => setSelectedAlert(event.target.value)}
              >
                <option value="">{context?.catalog.alerts.length ? "Select an alert" : "No open alerts"}</option>
                {context?.catalog.alerts.map((alert) => (
                  <option key={alert.id} value={alert.id}>{alert.label}</option>
                ))}
              </select>
              <Button
                className="w-full"
                disabled={!configured || !selectedAlert || Boolean(activeOperation)}
                onClick={() => void runOperation("alert", "Explain selected alert", () => explainOpenAlert(selectedAlert))}
                type="button"
              >
                Explain alert
              </Button>
            </div>
          </section>

          <section className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <MonitorCog className="text-primary" size={18} aria-hidden="true" />
              <h2 className="text-sm font-semibold">Device Guidance</h2>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-medium" htmlFor="ai-device-select">Managed device</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                disabled={!capabilities?.deviceTroubleshooting}
                id="ai-device-select"
                value={selectedDevice}
                onChange={(event) => setSelectedDevice(event.target.value)}
              >
                <option value="">{context?.catalog.devices.length ? "Select a device" : "No managed devices"}</option>
                {context?.catalog.devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>{device.hostname} ({device.status})</option>
                ))}
              </select>
              <label className="sr-only" htmlFor="ai-device-question">Device question</label>
              <input
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                disabled={!capabilities?.deviceTroubleshooting}
                id="ai-device-question"
                maxLength={500}
                placeholder="Optional diagnostic question"
                value={deviceQuestion}
                onChange={(event) => setDeviceQuestion(event.target.value)}
              />
              <Button
                className="w-full"
                disabled={!configured || !selectedDevice || Boolean(activeOperation)}
                onClick={() => void runOperation("device", "Troubleshoot selected device", () => getDeviceTroubleshooting(selectedDevice, deviceQuestion))}
                type="button"
              >
                Get guidance
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
