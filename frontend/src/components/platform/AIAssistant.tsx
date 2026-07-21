import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Copy,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getStoredAuthSession } from "@/features/auth/auth-service";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-context";

type Role = "user" | "assistant";

type AssistantAttachment = {
  name: string;
  mime_type: string;
  size: number;
  content?: string;
};

type AssistantMessage = {
  id: string;
  role: Role;
  content: string;
  attachments?: AssistantAttachment[];
  createdAt: string;
};

const storageKey = "ai-bos-floating-ai-history";
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const aiServiceUrl = viteEnv?.VITE_AI_SERVICE_URL ?? "http://127.0.0.1:8000/api/v1";

const suggestedQuestions = [
  "Summarize today's business priorities",
  "Which projects need attention?",
  "Create a follow-up plan for pending CRM leads",
  "Review revenue, tasks, and upcoming meetings",
];

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `message-${Date.now()}-${Math.random()}`;
}

function readHistory() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as AssistantMessage[]) : [];
  } catch {
    return [];
  }
}

function highlightCode(code: string) {
  const keywords = new Set(["const", "let", "var", "function", "return", "if", "else", "await", "async", "import", "from", "export", "type", "class", "new"]);
  return code.split(/(\s+|["'`][^"'`]*["'`]|\/\/.*|\b[A-Za-z_]\w*\b)/g).map((part, index) => {
    if (/^["'`]/.test(part)) return <span className="text-emerald-300" key={index}>{part}</span>;
    if (part.startsWith("//")) return <span className="text-slate-500" key={index}>{part}</span>;
    if (keywords.has(part)) return <span className="text-sky-300" key={index}>{part}</span>;
    return <span key={index}>{part}</span>;
  });
}

function renderInline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold" key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const blocks = content.split(/```/g);

  return (
    <div className="space-y-3 text-sm leading-7">
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          const [language, ...rest] = block.split("\n");
          const code = rest.join("\n") || language;
          return (
            <div className="overflow-hidden rounded-2xl border bg-slate-950 text-slate-100" key={index}>
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-400">
                <span>{rest.length ? language || "code" : "code"}</span>
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-6">
                <code>{highlightCode(code.trim())}</code>
              </pre>
            </div>
          );
        }

        return block
          .split("\n")
          .filter((line) => line.trim())
          .map((line, lineIndex) => {
            if (line.startsWith("- ")) {
              return <p className="pl-4" key={`${index}-${lineIndex}`}>• {renderInline(line.slice(2))}</p>;
            }
            if (/^\d+\.\s/.test(line)) {
              return <p className="pl-4" key={`${index}-${lineIndex}`}>{renderInline(line)}</p>;
            }
            if (line.startsWith("### ")) {
              return <h4 className="text-sm font-bold" key={`${index}-${lineIndex}`}>{renderInline(line.slice(4))}</h4>;
            }
            if (line.startsWith("## ")) {
              return <h3 className="text-base font-bold" key={`${index}-${lineIndex}`}>{renderInline(line.slice(3))}</h3>;
            }
            return <p key={`${index}-${lineIndex}`}>{renderInline(line)}</p>;
          });
      })}
    </div>
  );
}

async function fileToAttachment(file: File): Promise<AssistantAttachment> {
  const isReadableText = file.type.startsWith("text/")
    || ["application/json", "application/xml", "application/csv"].includes(file.type)
    || /\.(md|txt|csv|json|xml|log)$/i.test(file.name);
  const isImage = file.type.startsWith("image/");

  if (!isReadableText && !isImage) {
    return { name: file.name, mime_type: file.type || "application/octet-stream", size: file.size };
  }

  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    if (isImage) reader.readAsDataURL(file);
    else reader.readAsText(file);
  });

  return {
    name: file.name,
    mime_type: file.type || "application/octet-stream",
    size: file.size,
    content: content.slice(0, 38000),
  };
}

export function AIAssistant() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>(readHistory);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AssistantAttachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = useMemo(() => getStoredAuthSession(), []);
  const submitRef = useRef<any>(null);

  const submitMessage = useCallback(async (
    messageText?: string,
    options: {
      baseMessages?: AssistantMessage[];
      regenerate?: boolean;
      requestAttachments?: AssistantAttachment[];
    } = {},
  ) => {
    const trimmed = (messageText ?? input).trim();
    if (!trimmed || streaming) return;

    const outgoingAttachments = options.requestAttachments ?? attachments;
    const userMessage: AssistantMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      attachments: outgoingAttachments,
      createdAt: new Date().toISOString(),
    };
    const assistantId = createId();
    const nextMessages = options.baseMessages ?? (options.regenerate ? messages : [...messages, userMessage]);

    setMessages([
      ...nextMessages,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setAttachments([]);
    setStreaming(true);

    try {
      const response = await fetch(`${aiServiceUrl}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken ? { Authorization: `${session.tokenType} ${session.accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId,
          history: nextMessages.slice(-12).map((item) => ({ role: item.role, content: item.content })),
          attachments: outgoingAttachments,
          include_business_context: Boolean(session?.accessToken),
        }),
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || "AI service request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let responseText = "";

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
          responseText += data;
          setMessages((current) =>
            current.map((item) => (item.id === assistantId ? { ...item, content: responseText } : item)),
          );
        }
      }

      if (!conversationId) setConversationId(createId());
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI service unavailable";
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: `AI assistant could not respond.\n\n${message}\n\nConfigure a real provider in **Admin > AI Configuration** and make sure the AI service is running.`,
              }
            : item,
        ),
      );
      toast({ title: "AI request failed", description: "No mock response was used.", type: "error" });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, attachments, messages, conversationId, session, toast]);

  useEffect(() => {
    submitRef.current = submitMessage;
  }, [submitMessage]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleVoiceTranscript = (event: Event) => {
      const detail = (event as CustomEvent).detail as { text: string } | undefined;
      if (detail?.text && submitRef.current) {
        setInput(detail.text);
        void submitRef.current(detail.text);
      }
    };
    const handleOpenAIAssistant = () => {
      setOpen(true);
      setMinimized(false);
    };
    window.addEventListener("ai-bos:voice-transcript", handleVoiceTranscript);
    window.addEventListener("ai-bos:open-ai-assistant", handleOpenAIAssistant);
    return () => {
      window.removeEventListener("ai-bos:voice-transcript", handleVoiceTranscript);
      window.removeEventListener("ai-bos:open-ai-assistant", handleOpenAIAssistant);
    };
  }, []);

  const regenerate = () => {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (lastUser) {
      let lastAssistantIndex = -1;
      messages.forEach((item, index) => {
        if (item.role === "assistant") lastAssistantIndex = index;
      });
      const baseMessages = lastAssistantIndex >= 0 ? messages.slice(0, lastAssistantIndex) : messages;
      void submitMessage(lastUser.content, {
        baseMessages,
        regenerate: true,
        requestAttachments: lastUser.attachments ?? [],
      });
    }
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const nextAttachments = await Promise.all(Array.from(files).slice(0, 5).map(fileToAttachment));
    setAttachments((current) => [...current, ...nextAttachments].slice(0, 8));
    toast({ title: "Files attached", description: `${nextAttachments.length} file(s) ready for AI context.`, type: "success" });
  };

  return (
    <div className="fixed bottom-5 right-24 z-[70] sm:right-24">
      <AnimatePresence>
        {open && !minimized && (
          <motion.section
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "mb-4 flex overflow-hidden rounded-3xl border bg-background/95 shadow-glass backdrop-blur-2xl",
              maximized
                ? "fixed inset-4 z-[75] h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] flex-col"
                : "h-[640px] max-h-[calc(100vh-7rem)] w-[min(440px,calc(100vw-2rem))] flex-col",
            )}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
          >
            <header className="flex items-center justify-between gap-3 border-b p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">AI Assistant</p>
                  <p className="text-xs text-muted-foreground">Connected to AI BOS business APIs</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button aria-label="Regenerate response" disabled={streaming || !messages.some((item) => item.role === "user")} onClick={regenerate} size="icon" type="button" variant="ghost">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button aria-label={maximized ? "Restore assistant" : "Maximize assistant"} onClick={() => setMaximized((value) => !value)} size="icon" type="button" variant="ghost">
                  {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button aria-label="Minimize assistant" onClick={() => setMinimized(true)} size="icon" type="button" variant="ghost">
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button aria-label="Close assistant" onClick={() => setOpen(false)} size="icon" type="button" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center gap-4">
                  <div className="rounded-3xl border bg-card/65 p-5 text-center">
                    <Sparkles className="mx-auto mb-4 h-8 w-8 text-primary" />
                    <h2 className="text-lg font-bold">Ask about your business</h2>
                    <p className="mt-2 text-sm text-muted-foreground">I can use your AI BOS backend data when you are logged in.</p>
                  </div>
                  <div className="grid gap-2">
                    {suggestedQuestions.map((question) => (
                      <button className="rounded-2xl border bg-background/65 p-3 text-left text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/40" key={question} onClick={() => void submitMessage(question)} type="button">
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <article className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")} key={message.id}>
                      <div className={cn("max-w-[88%] rounded-3xl border p-4", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card/75")}>
                        {message.content ? <MarkdownMessage content={message.content} /> : <Loader2 className="h-4 w-4 animate-spin" />}
                        {message.attachments?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.attachments.map((attachment) => (
                              <span className="rounded-full bg-background/20 px-2.5 py-1 text-xs font-semibold" key={attachment.name}>{attachment.name}</span>
                            ))}
                          </div>
                        ) : null}
                        {message.role === "assistant" && message.content && (
                          <Button className="mt-3 h-8" onClick={() => void navigator.clipboard.writeText(message.content)} size="sm" type="button" variant="outline">
                            <Copy className="h-3.5 w-3.5" />
                            Copy Response
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="border-t px-4 py-2">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <span className="inline-flex items-center gap-2 rounded-full border bg-card/65 px-3 py-1 text-xs font-semibold" key={attachment.name}>
                      {attachment.mime_type.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                      {attachment.name}
                      <button onClick={() => setAttachments((current) => current.filter((item) => item.name !== attachment.name))} type="button">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <form
              className="border-t p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitMessage();
              }}
            >
              <div className="flex items-end gap-2 rounded-3xl border bg-card/65 p-2">
                <textarea
                  className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitMessage();
                    }
                  }}
                  placeholder="Ask AI BOS..."
                  value={input}
                />
                <input className="hidden" multiple onChange={(event) => void addFiles(event.target.files)} ref={fileInputRef} type="file" />
                <input accept="image/*" className="hidden" multiple onChange={(event) => void addFiles(event.target.files)} ref={imageInputRef} type="file" />
                <Button aria-label="Attach files" onClick={() => fileInputRef.current?.click()} size="icon" type="button" variant="ghost">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button aria-label="Upload images" onClick={() => imageInputRef.current?.click()} size="icon" type="button" variant="ghost">
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button aria-label="Send message" disabled={streaming || !input.trim()} size="icon" type="submit">
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {open && minimized ? (
        <Button className="h-12 rounded-2xl shadow-glow" onClick={() => setMinimized(false)} type="button">
          <MessageSquareText className="h-4 w-4" />
          AI Assistant
        </Button>
      ) : (
        <motion.button
          aria-label="Open AI assistant"
          className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-glow dark:bg-white dark:text-slate-950", open && "hidden")}
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Bot className="h-5 w-5" />
        </motion.button>
      )}
    </div>
  );
}