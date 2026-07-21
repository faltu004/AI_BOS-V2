import { motion } from "framer-motion";
import {
  Bot,
  BriefcaseBusiness,
  CircleDollarSign,
  Code2,
  LifeBuoy,
  Megaphone,
  MessageSquareText,
  Send,
  Settings2,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { getStoredAuthSession } from "@/features/auth/auth-service";
import { cn } from "@/lib/utils";

const agentIcons: Record<string, typeof BriefcaseBusiness> = {
  BriefcaseBusiness,
  UsersRound,
  CircleDollarSign,
  TrendingUp,
  Megaphone,
  Code2,
  LifeBuoy,
  Bot,
};

const agentColors: Record<string, string> = {
  primary: "text-primary",
  success: "text-emerald-600 dark:text-emerald-300",
  warning: "text-amber-600 dark:text-amber-300",
  info: "text-sky-600 dark:text-sky-300",
  rose: "text-rose-600 dark:text-rose-300",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive",
};

type AgentInfo = {
  agent_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent_id?: string;
  timestamp: string;
};

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const aiServiceUrl = viteEnv?.VITE_AI_SERVICE_URL ?? "http://127.0.0.1:8000/api/v1";

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function MultiAgentPage() {
  const navigate = useNavigate();
  const session = useMemo(() => getStoredAuthSession(), []);
  const token = session?.accessToken;
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef(createId());

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(`${aiServiceUrl}/agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setAgents(data.data);
          if (data.data.length > 0) setSelectedAgent(data.data[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming || !selectedAgent) return;
    setInput("");
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
      agent_id: selectedAgent.agent_id,
      timestamp: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    setStreaming(true);

    try {
      const response = await fetch(`${aiServiceUrl}/multi-agent/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          agent_id: selectedAgent.agent_id,
          conversation_id: conversationIdRef.current,
          history: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          include_business_context: true,
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || "Multi-agent request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      setMessages((current) => [...current, { id: createId(), role: "assistant", content: "", agent_id: selectedAgent.agent_id, timestamp: new Date().toISOString() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const data = event
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""))
            .join("\n");
          if (!data || data === "[DONE]") continue;
          assistantContent += data;
          setMessages((current) =>
            current.map((msg) =>
              msg.id === current[current.length - 1]?.id ? { ...msg, content: assistantContent } : msg,
            ),
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Multi-agent service unavailable";
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: `Multi-agent system could not respond.\n\n${message}\n\nConfigure AI providers in Admin > AI Configuration.`,
          agent_id: selectedAgent.agent_id,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  const switchAgent = (agent: AgentInfo) => {
    setSelectedAgent(agent);
    conversationIdRef.current = createId();
    setMessages([]);
  };

  const clearHistory = () => {
    conversationIdRef.current = createId();
    setMessages([]);
  };

  return (
    <main className="flex min-h-screen bg-enterprise">
      <div className={cn("flex flex-col border-r bg-background/78 backdrop-blur-xl transition-all duration-300", sidebarOpen ? "w-72" : "w-0 overflow-hidden")}>
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold">AI Agents</span>
          </div>
          <Button aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} size="icon" type="button" variant="ghost">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Select Agent</p>
          <div className="space-y-2">
            {agents.map((agent) => {
              const Icon = agentIcons[agent.icon] ?? Bot;
              const colorClass = agentColors[agent.color] ?? "text-primary";
              const isActive = selectedAgent?.agent_id === agent.agent_id;
              return (
                <button
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40",
                    isActive ? "border-primary/50 bg-primary/5" : "bg-background/65",
                  )}
                  key={agent.agent_id}
                  onClick={() => switchAgent(agent)}
                  type="button"
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10", colorClass)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{agent.name}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{agent.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button aria-label="Open sidebar" onClick={() => setSidebarOpen(true)} size="icon" type="button" variant="ghost">
                  <Settings2 className="h-4 w-4" />
                </Button>
              )}
              <div>
                <p className="text-sm font-semibold text-primary">Multi-Agent AI</p>
                <h1 className="text-xl font-bold">
                  {selectedAgent ? `${selectedAgent.name} Workspace` : "Select an Agent"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild type="button" variant="outline">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <ThemeToggle />
              <Button onClick={clearHistory} type="button" variant="outline">
                Clear Chat
              </Button>
            </div>
          </div>
        </header>

        <div className="flex min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {selectedAgent && (
              <div className="container flex flex-wrap gap-2 py-4">
                {selectedAgent.capabilities.map((cap) => (
                  <span className="rounded-full border bg-background/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground" key={cap}>
                    {cap}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    description={
                      selectedAgent
                        ? `Chat with ${selectedAgent.name} to get insights and assistance.`
                        : "Select an AI agent to start chatting."
                    }
                    icon={MessageSquareText}
                    title={selectedAgent ? `${selectedAgent.name} Ready` : "No Agent Selected"}
                  />
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-4">
                  {messages.map((msg) => {
                    const Icon = agentIcons[selectedAgent?.icon ?? "Bot"] ?? Bot;
                    const isUser = msg.role === "user";
                    return (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex", isUser ? "justify-end" : "justify-start")}
                        initial={{ opacity: 0, y: 10 }}
                        key={msg.id}
                      >
                        <div className={cn("max-w-[85%] rounded-2xl border p-4", isUser ? "bg-primary text-primary-foreground" : "bg-card/75")}>
                          {!isUser && (
                            <div className="mb-2 flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="text-xs font-semibold text-primary">{selectedAgent?.name}</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap text-sm leading-7">{msg.content}</p>
                          <span className="mt-2 block text-xs opacity-60">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t bg-background/78 p-4 backdrop-blur-xl">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-2 rounded-2xl border bg-card/65 p-2">
                  <textarea
                    className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
                    disabled={!selectedAgent || streaming}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder={selectedAgent ? `Ask ${selectedAgent.name}...` : "Select an agent to start..."}
                    value={input}
                  />
                  <Button
                    aria-label="Send message"
                    disabled={!selectedAgent || streaming || !input.trim()}
                    onClick={sendMessage}
                    size="icon"
                    type="submit"
                  >
                    {streaming ? <Bot className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
