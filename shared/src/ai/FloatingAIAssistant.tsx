import { FormEvent, memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Bot, Loader2, Maximize2, MessageSquareText, Send, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { fetchAIContext, sendAIMessage } from "./ai.api";
import type { AIChatMessage, AIContextResponse } from "./ai.types";

const STORAGE_KEY = "bos_ai_assistant_history";
const HIDDEN_PATHS = ["/", "/login", "/forgot-password", "/reset-password", "/verify-email"];
const MIN_PANEL_WIDTH = 340;
const MIN_PANEL_HEIGHT = 420;

function createMessage(role: AIChatMessage["role"], content: string): AIChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function readStoredMessages(): AIChatMessage[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as AIChatMessage[];
    return Array.isArray(parsed) ? parsed.slice(-20) : [];
  } catch {
    return [];
  }
}

function compactScope(scope: string) {
  return scope.replace(/_/g, " ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPanelSize(expanded: boolean) {
  const maxWidth = Math.max(MIN_PANEL_WIDTH, window.innerWidth - 24);
  const maxHeight = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - 24);
  return {
    width: Math.min(expanded ? 820 : 620, maxWidth),
    height: Math.min(expanded ? 760 : 700, maxHeight),
  };
}

function getCenteredPanelPosition(size: { width: number; height: number }) {
  return {
    x: Math.max(12, (window.innerWidth - size.width) / 2),
    y: Math.max(12, (window.innerHeight - size.height) / 2),
  };
}

export const FloatingAIAssistant = memo(function FloatingAIAssistant() {
  const location = useLocation();
  const [session, setSession] = useState(() => getStoredAuthSession());
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<AIContextResponse | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>(() => readStoredMessages());
  const [backdropBlurred, setBackdropBlurred] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 620, height: 700 });
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const isDashboard = location.pathname === "/dashboard";

  const hidden = useMemo(
    () => !session || HIDDEN_PATHS.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`)),
    [location.pathname, session],
  );

  useEffect(() => {
    setSession(getStoredAuthSession());
  }, [location.key]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
  }, [messages]);

  useEffect(() => {
    if (!open || context || contextLoading) return;

    setContextLoading(true);
    fetchAIContext()
      .then((data) => {
        setContext(data);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load AI assistant."))
      .finally(() => setContextLoading(false));
  }, [context, contextLoading, open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const size = getPanelSize(expanded);
    setPanelSize(size);
    setPanelPosition(getCenteredPanelPosition(size));
  }, [expanded, open]);

  function resetPanel(nextExpanded = expanded) {
    const size = getPanelSize(nextExpanded);
    setPanelSize(size);
    setPanelPosition(getCenteredPanelPosition(size));
  }

  function handlePanelDragStart(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, input, textarea, a")) return;
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    setPanelSize({ width: rect.width, height: rect.height });

    function movePanel(moveEvent: PointerEvent) {
      setPanelPosition({
        x: clamp(moveEvent.clientX - offsetX, 8, Math.max(8, window.innerWidth - rect.width - 8)),
        y: clamp(moveEvent.clientY - offsetY, 8, Math.max(8, window.innerHeight - rect.height - 8)),
      });
    }

    function stopDragging() {
      window.removeEventListener("pointermove", movePanel);
      window.removeEventListener("pointerup", stopDragging);
    }

    window.addEventListener("pointermove", movePanel);
    window.addEventListener("pointerup", stopDragging);
  }

  function handlePanelResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;
    setPanelPosition({ x: rect.left, y: rect.top });

    function resizePanel(moveEvent: PointerEvent) {
      setPanelSize({
        width: clamp(startWidth + moveEvent.clientX - startX, MIN_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, window.innerWidth - rect.left - 8)),
        height: clamp(startHeight + moveEvent.clientY - startY, MIN_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, window.innerHeight - rect.top - 8)),
      });
    }

    function stopResizing() {
      window.removeEventListener("pointermove", resizePanel);
      window.removeEventListener("pointerup", stopResizing);
    }

    window.addEventListener("pointermove", resizePanel);
    window.addEventListener("pointerup", stopResizing);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = createMessage("user", text);
    const priorHistory = messages.slice(-8).map((message) => ({ role: message.role, content: message.content }));
    const nextMessages = [...messages, userMessage].slice(-20);
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await sendAIMessage(text, priorHistory);
      setContext((current) => ({
        role: response.role,
        scope: response.scope,
        sources: response.sources,
        suggestions: response.suggestions,
        preview: current?.preview ?? null,
      }));
      setMessages((current) => [...current, createMessage("assistant", response.answer)].slice(-20));
      if (response.usedFallback) {
        setError("Local model offline; showing safe backend summary.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI assistant request failed.");
      setMessages((current) => [...current, createMessage("assistant", "I could not complete that request right now.")].slice(-20));
    } finally {
      setLoading(false);
    }
  }

  if (hidden) return null;

  return (
    <div
      className={
        open
          ? [
              "fixed inset-0 z-[70]",
              backdropBlurred
                ? "pointer-events-auto bg-slate-950/15 backdrop-blur-sm dark:bg-slate-950/25"
                : "pointer-events-none bg-transparent backdrop-blur-0",
            ].join(" ")
          : isDashboard
            ? "pointer-events-none fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 sm:bottom-8"
            : "pointer-events-none fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6"
      }
      onPointerDown={open ? () => setBackdropBlurred(false) : undefined}
    >
      {open ? (
        <section
          aria-label="Company AI assistant"
          ref={panelRef}
          style={{
            height: panelSize.height,
            left: panelPosition?.x ?? "50%",
            top: panelPosition?.y ?? "50%",
            transform: panelPosition ? undefined : "translate(-50%, -50%)",
            width: panelSize.width,
          }}
          className={[
            "pointer-events-auto fixed flex max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-primary/25 bg-card text-card-foreground shadow-2xl shadow-cyan-950/15 dark:border-cyan-200/25 dark:bg-slate-950/95 dark:text-slate-100 dark:shadow-cyan-950/30",
          ].join(" ")}
          onPointerDown={(event) => {
            event.stopPropagation();
            setBackdropBlurred(true);
          }}
        >
          <header className="flex cursor-move touch-none items-center justify-between border-b border-border px-4 py-3 dark:border-white/10" onPointerDown={handlePanelDragStart}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary dark:bg-cyan-400/15 dark:text-cyan-200">
                <Bot size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">Company AI Assistant</h2>
                <p className="truncate text-xs capitalize text-muted-foreground dark:text-slate-400">
                  {context ? `${context.role} - ${compactScope(context.scope)}` : "Role-safe database assistant"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label={expanded ? "Collapse AI assistant" : "Expand AI assistant"}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                type="button"
                onClick={() =>
                  setExpanded((value) => {
                    resetPanel(!value);
                    return !value;
                  })
                }
              >
                <Maximize2 size={17} aria-hidden="true" />
              </button>
              <button
                aria-label="Close AI assistant"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="border-b border-border px-4 py-3 dark:border-white/10">
            {contextLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-slate-400">
                <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                Preparing allowed company context
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(context?.suggestions ?? ["Company summary", "My access", "Project status"]).slice(0, 4).map((suggestion) => (
                  <button
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition hover:border-primary/45 hover:bg-primary/10 dark:border-white/10 dark:text-slate-200 dark:hover:border-cyan-300/50 dark:hover:bg-cyan-300/10"
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sparkles className="mb-3 text-primary dark:text-cyan-200" size={30} aria-hidden="true" />
                <p className="max-w-[280px] text-sm text-muted-foreground dark:text-slate-300">
                  Ask about allowed employees, projects, policies, notifications, and company status.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
                  <div
                    className={[
                      "max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6",
                      message.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground dark:bg-cyan-300 dark:text-slate-950"
                        : "rounded-bl-md border border-border bg-muted/45 text-foreground dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100",
                    ].join(" ")}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {loading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-muted/45 px-3.5 py-2.5 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300">
                  <Loader2 className="animate-spin" size={15} aria-hidden="true" />
                  Thinking with allowed data
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="border-t border-amber-300/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-200">{error}</p> : null}

          <form className="flex items-end gap-2 border-t border-border p-3 dark:border-white/10" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="ai-assistant-message">
              Message
            </label>
            <textarea
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-300/60 dark:focus:ring-cyan-300/20"
              id="ai-assistant-message"
              placeholder="Ask with your role access..."
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              aria-label="Send message"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
              disabled={!input.trim() || loading}
              type="submit"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
          <div
            aria-label="Resize AI assistant"
            className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize rounded-br-lg border-b-2 border-r-2 border-primary/50 dark:border-cyan-200/60"
            role="separator"
            tabIndex={0}
            onPointerDown={handlePanelResizeStart}
          />
        </section>
      ) : null}

      {!open ? (
        <button
          aria-label="Open AI assistant"
          className={[
            "pointer-events-auto group inline-flex items-center justify-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 text-sm font-semibold text-slate-800 shadow-xl shadow-cyan-950/15 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-300",
            isDashboard ? "h-11 sm:h-12" : "h-10",
          ].join(" ")}
          type="button"
          onClick={() => {
            setOpen(true);
            setBackdropBlurred(true);
            resetPanel(false);
          }}
        >
          <MessageSquareText className="transition group-hover:scale-105" size={18} aria-hidden="true" />
          <span>AI Analyzer</span>
        </button>
      ) : null}
    </div>
  );
});
