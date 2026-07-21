import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  GripVertical,
  LineChart as LineChartIcon,
  Mail,
  Maximize2,
  MessageSquareText,
  Minimize2,
  MoreVertical,
  Pin,
  PinOff,
  RefreshCcw,
  Search,
  Send,
  Settings2,
  Share2,
  Sparkles,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getStoredAuthSession } from "@/features/auth/auth-service";
import { cn } from "@/lib/utils";
import type { CopilotAgent, CopilotContext, CopilotMessage, PageContext } from "./copilot.types";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBase = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

const agentIcons: Record<CopilotAgent, typeof Bot> = {
  ceo: Bot,
  hr: Bot,
  finance: Bot,
  sales: Bot,
  marketing: Bot,
  developer: Bot,
  support: Bot,
  meeting: Bot,
  document: Bot,
  analytics: Bot,
  report: FileText,
  project: Bot,
};

const agentColors: Record<CopilotAgent, string> = {
  ceo: "text-primary",
  hr: "text-emerald-600 dark:text-emerald-300",
  finance: "text-amber-600 dark:text-amber-300",
  sales: "text-sky-600 dark:text-sky-300",
  marketing: "text-rose-600 dark:text-rose-300",
  developer: "text-secondary-foreground",
  support: "text-destructive",
  meeting: "text-purple-600 dark:text-purple-300",
  document: "text-pink-600 dark:text-pink-300",
  analytics: "text-blue-600 dark:text-blue-300",
  report: "text-orange-600 dark:text-orange-300",
  project: "text-teal-600 dark:text-teal-300",
};

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function CopilotPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const session = useMemo(() => getStoredAuthSession(), []);
  const token = session?.accessToken;

  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<CopilotContext | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [copilotMinimized, setCopilotMinimized] = useState(false);
  const [copilotMaximized, setCopilotMaximized] = useState(false);
  const [copilotDock, setCopilotDock] = useState<"right" | "left">("right");
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef(createId());

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/copilot/context`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setContext(data.data);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetch(`${apiBase}/copilot/suggestions`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setContext((current) => current ? { ...current, suggestions: data.data } : current);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCopilotOpen((v) => !v);
        setCopilotMinimized(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMessage: CopilotMessage = {
      id: createId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/copilot/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          conversationId: conversationIdRef.current,
          pageContext: context?.page || {},
          history: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("Copilot request failed");

      const json = await response.json();
      const data = json.data as { message: string; agent: CopilotAgent; suggestions: string[]; confidence: number };

      const assistantMessage: CopilotMessage = {
        id: createId(),
        role: "assistant",
        content: data.message,
        agent: data.agent,
        timestamp: new Date().toISOString(),
        confidence: data.confidence,
      };
      setMessages((current) => [...current, assistantMessage]);
      setRecent((current) => [text, ...current.filter((item) => item !== text)].slice(0, 10));
    } catch {
      toast({ title: "Copilot unavailable", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [input, loading, token, context, messages, toast]);

  const togglePin = (text: string) => {
    setPinned((current) => (current.includes(text) ? current.filter((item) => item !== text) : [...current, text]));
  };

  const deleteMessage = async (id: string) => {
    const accepted = await confirm({ title: "Delete message?", description: "This message will be removed from the conversation.", confirmLabel: "Delete", tone: "danger" });
    if (!accepted) return;
    setMessages((current) => current.filter((m) => m.id !== id));
  };

  const clearHistory = () => {
    conversationIdRef.current = createId();
    setMessages([]);
    toast({ title: "Conversation cleared", type: "success" });
  };

  const AgentIcon = context?.agent ? agentIcons[context.agent] || Bot : Bot;
  const agentColor = context?.agent ? agentColors[context.agent] || "text-primary" : "text-primary";

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-enterprise p-4">
        <EmptyState action={{ label: "Login", onClick: () => window.location.assign("/login") }} description="Global AI Copilot requires authentication." icon={Bot} title="Authentication required" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" type="button" variant="outline">
              <Link aria-label="Back to dashboard" to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <p className="text-sm font-semibold text-primary">AI / Global Copilot</p>
              <h1 className="text-2xl font-bold">Global AI Copilot</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCopilotDock((d) => (d === "right" ? "left" : "right"))} type="button" variant="outline" title={`Dock ${copilotDock === "right" ? "Left" : "Right"}`}>
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCopilotMaximized((v) => !v)} type="button" variant="outline">
              {copilotMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button onClick={clearHistory} type="button" variant="outline">Clear Chat</Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className={`container grid gap-6 py-6 transition-all ${copilotMaximized ? "xl:grid-cols-1" : "xl:grid-cols-[1fr_380px]"}`}>
        <div className="flex min-h-0 flex-col rounded-2xl border bg-background/65">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10", agentColor)}>
                <AgentIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Global AI Copilot</p>
                <p className="text-xs text-muted-foreground">Context-aware assistant for AI BOS</p>
              </div>
            </div>
            {context && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                {context.page?.module || "General"} Agent
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center gap-4">
                <div className="rounded-2xl border bg-card/65 p-6 text-center">
                  <Sparkles className="mx-auto mb-4 h-8 w-8 text-primary" />
                  <h2 className="text-lg font-bold">How can I help you today?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">I understand your business context and can assist across all modules.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(context?.suggestions || []).map((suggestion) => (
                    <button className="rounded-2xl border bg-background/65 p-3 text-left text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/40" key={suggestion} onClick={() => { setInput(suggestion); void sendMessage(); }} type="button">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
                    <div className={`max-w-[85%] rounded-2xl border p-4 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card/75"}`}>
                      {message.agent && message.role === "assistant" && (
                        <div className="mb-2 flex items-center gap-2">
                          <span className={cn("flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs", agentColors[message.agent] || "text-primary")}>
                            {message.agent[0].toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold capitalize text-primary">{message.agent} Agent</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                      {message.confidence && (
                        <span className="mt-2 block text-xs opacity-70">Confidence: {message.confidence}%</span>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs opacity-60">{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {message.role === "assistant" && (
                          <>
                            <Button onClick={() => void navigator.clipboard.writeText(message.content)} size="icon" type="button" variant="ghost">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button onClick={() => deleteMessage(message.id)} size="icon" type="button" variant="ghost">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border bg-card/75 p-4">
                      <div className="flex items-center gap-2">
                        <RefreshCcw className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t p-4">
            <div className="flex items-end gap-2 rounded-2xl border bg-card/65 p-2">
              <textarea
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask anything about your business..."
                value={input}
              />
              <Button aria-label="Send message" disabled={loading || !input.trim()} onClick={sendMessage} size="icon" type="submit">
                {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {!copilotMaximized && (
          <div className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {context?.page ? (
                  <>
                    <div className="flex items-center justify-between rounded-xl border bg-background/65 p-3">
                      <span className="text-sm font-semibold">Page</span>
                      <span className="text-xs text-muted-foreground capitalize">{context.page.page}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border bg-background/65 p-3">
                      <span className="text-sm font-semibold">Module</span>
                      <span className="text-xs text-muted-foreground capitalize">{context.page.module}</span>
                    </div>
                    {context.page.recordId && (
                      <div className="flex items-center justify-between rounded-xl border bg-background/65 p-3">
                        <span className="text-sm font-semibold">Record</span>
                        <span className="text-xs text-muted-foreground">{context.page.recordId}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific page context detected.</p>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">AVAILABLE MODULES</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(context?.availableModules || []).map((module) => (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary" key={module}>{module}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {(context?.suggestions || []).slice(0, 6).map((suggestion) => (
                    <button className="flex items-center gap-2 rounded-xl border bg-background/65 p-3 text-left text-sm transition-all hover:border-primary/40" key={suggestion} onClick={() => { setInput(suggestion); void sendMessage(); }} type="button">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="line-clamp-1">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
