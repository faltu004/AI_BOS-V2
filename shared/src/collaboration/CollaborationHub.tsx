import {
  AtSign,
  Building2,
  FolderKanban,
  Hash,
  MessageSquare,
  Paperclip,
  Pin,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { EmptyState } from "@shared/ui/empty-state";
import { Input } from "@shared/ui/input";
import { useToast } from "@shared/ui/toast-context";
import {
  createDirectRoom,
  deleteMessage,
  fetchDirectory,
  fetchMessages,
  fetchNote,
  fetchPinnedMessages,
  fetchRooms,
  markRoomRead,
  resolveCollaborationAssetUrl,
  searchMessages,
  sendMessage as sendMessageRequest,
  uploadAttachment,
} from "./collaboration.api";
import { decodeUserIdFromToken } from "@shared/auth/decode-jwt";
import type {
  CollaborationMessage,
  CollaborationNote,
  CollaborationRoom,
  DirectoryUser,
} from "./collaboration.schema";
import { useCollaborationSocket } from "./useCollaborationSocket";

const quickReactions = ["👍", "🎉", "❤️", "👀", "✅"];

const roomTypeIcons: Record<CollaborationRoom["roomType"], typeof Hash> = {
  workspace: Building2,
  team: Users,
  project: FolderKanban,
  entity: Hash,
  direct: MessageSquare,
};

function formatTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupRooms(rooms: CollaborationRoom[]) {
  return {
    workspace: rooms.filter((room) => room.roomType === "workspace"),
    team: rooms.filter((room) => room.roomType === "team"),
    project: rooms.filter((room) => room.roomType === "project"),
    direct: rooms.filter((room) => room.roomType === "direct"),
  };
}

function renderBody(body: string, directory: DirectoryUser[]) {
  const byId = new Map(directory.map((user) => [user._id, user.fullName]));
  const parts = body.split(/(@[^()@\n]{1,120}\([0-9a-fA-F]{24}\))/g);

  return parts.map((part, index) => {
    const match = part.match(/^@([^()@\n]{1,120})\(([0-9a-fA-F]{24})\)$/);
    if (match) {
      const name = byId.get(match[2]) ?? match[1];
      return (
        <span key={index} className="rounded bg-primary/10 px-1 py-0.5 font-medium text-primary">
          @{name}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function toId(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function sameId(left: unknown, right: unknown) {
  return toId(left) === toId(right);
}

function mergeMessageList(current: CollaborationMessage[], message: CollaborationMessage) {
  if (current.some((item) => sameId(item._id, message._id))) {
    return current.map((item) => (sameId(item._id, message._id) ? message : item));
  }

  return [...current, message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function mergeMessageLists(current: CollaborationMessage[], incoming: CollaborationMessage[]) {
  return incoming.reduce((merged, message) => mergeMessageList(merged, message), current);
}

export function CollaborationHub() {
  const { toast } = useToast();
  const [session, setSession] = useState(() => getStoredAuthSession());
  const token = session?.accessToken;
  const currentUserId = useMemo(() => (token ? decodeUserIdFromToken(token) : null), [token]);

  const [rooms, setRooms] = useState<CollaborationRoom[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<CollaborationMessage[]>([]);
  const [note, setNote] = useState<CollaborationNote | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [rightTab, setRightTab] = useState<"notes" | "documents" | "activity">("notes");
  const [mobilePanel, setMobilePanel] = useState<"rooms" | "chat" | "details">("chat");
  const [composerText, setComposerText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollaborationMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  const selectedRoom = rooms.find((room) => room._id === selectedRoomId) ?? null;
  const directoryById = useMemo(() => new Map(directory.map((user) => [user._id, user])), [directory]);

  const { joinRoom, sendMessage: sendMessageSocket, react, pin, updateNote: updateNoteSocket } = useCollaborationSocket(token, {
    onMessageNew(message) {
      setMessages((current) => (sameId(message.roomId, selectedRoomId) ? mergeMessageList(current, message) : current));
      setRooms((current) =>
        current.map((room) =>
          sameId(room._id, message.roomId)
            ? { ...room, lastMessage: { body: message.body, authorId: message.authorId, createdAt: message.createdAt } }
            : room,
        ),
      );
    },
    onMessageUpdated(message) {
      setMessages((current) => current.map((item) => (item._id === message._id ? message : item)));
      setPinnedMessages((current) => {
        const withoutMessage = current.filter((item) => item._id !== message._id);
        return message.isPinned ? [message, ...withoutMessage] : withoutMessage;
      });
    },
    onNoteUpdated(updated) {
      if (sameId(updated.roomId, selectedRoomId)) {
        setNote(updated);
        setNoteDraft(updated.body);
      }
    },
  });

  function mergeSentMessage(message: CollaborationMessage) {
    setMessages((current) => (sameId(message.roomId, selectedRoomId) ? mergeMessageList(current, message) : current));
    setRooms((current) =>
      current.map((room) =>
        sameId(room._id, message.roomId)
          ? { ...room, lastMessage: { body: message.body, authorId: message.authorId, createdAt: message.createdAt } }
          : room,
      ),
    );
  }

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const currentSession = session;

    async function loadInitialData() {
      setLoading(true);
      const activeSession = isSessionExpired(currentSession) ? await refreshSession() : currentSession;

      if (cancelled) return;

      if (!activeSession) {
        setSession(null);
        setLoading(false);
        return;
      }

      if (activeSession.accessToken !== currentSession.accessToken) {
        setSession(activeSession);
        return;
      }

      Promise.all([fetchRooms(activeSession.accessToken), fetchDirectory(activeSession.accessToken)])
        .then(([roomList, directoryList]) => {
          if (cancelled) return;
          setRooms(roomList);
          setDirectory(directoryList);
          setSelectedRoomId((current) => current ?? roomList[0]?._id ?? null);
        })
        .catch((error: Error) => {
          if (error.message.includes("Session expired")) {
            setSession(null);
            return;
          }
          if (!cancelled) {
            toast({ title: "Could not load collaboration hub", description: error.message, type: "error" });
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  useEffect(() => {
    if (!selectedRoomId || !token) return;

    joinRoom(selectedRoomId).catch(() => undefined);

    Promise.all([
      fetchMessages(selectedRoomId, token),
      fetchPinnedMessages(selectedRoomId, token),
      fetchNote(selectedRoomId, token),
    ])
      .then(([messageList, pinned, roomNote]) => {
        setMessages(messageList);
        setPinnedMessages(pinned);
        setNote(roomNote);
        setNoteDraft(roomNote.body);
      })
      .catch((error: Error) => toast({ title: "Could not load room", description: error.message, type: "error" }));

    markRoomRead(selectedRoomId, token).then(() => {
      setRooms((current) => current.map((room) => (room._id === selectedRoomId ? { ...room, unreadCount: 0 } : room)));
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, token]);

  useEffect(() => {
    if (!selectedRoomId || !token) return;

    let cancelled = false;
    let syncing = false;

    async function syncSelectedRoom() {
      if (syncing) return;
      syncing = true;
      try {
        const messageList = await fetchMessages(selectedRoomId!, token);
        if (!cancelled) {
          setMessages((current) => mergeMessageLists(current, messageList));
        }
      } catch {
        // Realtime remains the primary path; polling is only a silent safety net.
      } finally {
        syncing = false;
      }
    }

    const interval = window.setInterval(syncSelectedRoom, 2000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncSelectedRoom();
    };
    window.addEventListener("focus", syncSelectedRoom);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", syncSelectedRoom);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedRoomId, token]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const grouped = useMemo(() => groupRooms(rooms), [rooms]);

  function handleComposerChange(value: string) {
    setComposerText(value);
    const trailingMention = value.match(/@([a-zA-Z0-9 ]{0,40})$/);
    setMentionQuery(trailingMention ? trailingMention[1].toLowerCase() : null);
  }

  function insertMention(user: DirectoryUser) {
    const withoutTrailing = composerText.replace(/@([a-zA-Z0-9 ]{0,40})$/, "");
    setComposerText(`${withoutTrailing}@${user.fullName}(${user._id}) `);
    setMentionQuery(null);
  }

  async function handleSend() {
    if (!selectedRoomId || !composerText.trim()) return;
    try {
      const text = composerText.trim();
      const message = await sendMessageSocket(selectedRoomId, text, []);
      if (message) {
        mergeSentMessage(message);
      } else if (token) {
        mergeSentMessage(await sendMessageRequest(selectedRoomId, text, [], token));
      }
      setComposerText("");
    } catch (error) {
      toast({ title: "Message not sent", description: (error as Error).message, type: "error" });
    }
  }

  async function handleAttachment(file: File) {
    if (!selectedRoomId || !token) return;
    try {
      const attachment = await uploadAttachment(selectedRoomId, file, token);
      const message = await sendMessageSocket(selectedRoomId, composerText.trim(), [attachment]);
      if (message) {
        mergeSentMessage(message);
      } else {
        mergeSentMessage(await sendMessageRequest(selectedRoomId, composerText.trim(), [attachment], token));
      }
      setComposerText("");
    } catch (error) {
      toast({ title: "Attachment failed", description: (error as Error).message, type: "error" });
    }
  }

  async function handleStartDirectMessage(user: DirectoryUser) {
    if (!token) return;
    try {
      const room = await createDirectRoom([user._id], token);
      setRooms((current) => (current.some((existing) => existing._id === room._id) ? current : [...current, { ...room, unreadCount: 0, lastMessage: null }]));
      setSelectedRoomId(room._id);
      setMobilePanel("chat");
    } catch (error) {
      toast({ title: "Could not start conversation", description: (error as Error).message, type: "error" });
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !token) return;
    try {
      const results = await searchMessages(searchQuery.trim(), token);
      setSearchResults(results);
    } catch (error) {
      toast({ title: "Search failed", description: (error as Error).message, type: "error" });
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!token) return;
    try {
      await deleteMessage(messageId, token);
      setMessages((current) => current.filter((message) => message._id !== messageId));
    } catch (error) {
      toast({ title: "Could not delete message", description: (error as Error).message, type: "error" });
    }
  }

  async function handleSaveNote() {
    if (!selectedRoomId) return;
    try {
      await updateNoteSocket(selectedRoomId, note?.title ?? "Shared notes", noteDraft);
    } catch (error) {
      toast({ title: "Could not save note", description: (error as Error).message, type: "error" });
    }
  }

  const attachmentsInRoom = messages.flatMap((message) => message.attachments.map((attachment) => ({ attachment, message })));

  const activityEvents = useMemo(() => {
    const events = messages.map((message) => ({
      id: message._id,
      time: message.createdAt,
      label: message.isPinned ? "Pinned a message" : "Sent a message",
      detail: message.body || "Shared an attachment",
    }));
    return events.slice(-15).reverse();
  }, [messages]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return directory
      .filter((user) => user.fullName.toLowerCase().includes(mentionQuery) && user._id !== currentUserId)
      .slice(0, 6);
  }, [mentionQuery, directory, currentUserId]);

  function getAuthorName(authorId: string) {
    if (sameId(authorId, currentUserId)) return "You";
    const normalizedAuthorId = toId(authorId);
    return directoryById.get(normalizedAuthorId)?.fullName ?? `Member ${normalizedAuthorId.slice(-6)}`;
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading company messenger...</div>;
  }

  if (!token) {
    return (
      <div className="p-6">
        <EmptyState
          icon={MessageSquare}
          title="Sign in required"
          description="Sign in to access company conversations, shared files, notes, and mentions."
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 p-3 lg:flex-row lg:gap-4 lg:p-4">
      <div className="grid grid-cols-3 gap-1 rounded-lg border bg-card p-1 lg:hidden">
        {(
          [
            ["rooms", "Conversations", Users],
            ["chat", "Chat", MessageSquare],
            ["details", "Details", Paperclip],
          ] as const
        ).map(([panel, label, Icon]) => (
          <button
            key={panel}
            type="button"
            onClick={() => setMobilePanel(panel)}
            className={cn(
              "flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors",
              mobilePanel === panel ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      <Card
        className={cn(
          "min-h-0 w-full shrink-0 flex-col overflow-hidden lg:flex lg:w-72",
          mobilePanel === "rooms" ? "flex" : "hidden",
        )}
      >
        <div className="border-b p-3">
          <div className="mb-3">
            <p className="text-sm font-semibold">Company Messenger</p>
            <p className="text-xs text-muted-foreground">Chat, share files, and keep room notes together.</p>
          </div>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              className="h-9"
            />
          </div>
          {searchResults && (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border bg-background/60 p-2 text-xs">
              {searchResults.length === 0 && <p className="text-muted-foreground">No matches</p>}
              {searchResults.map((result) => (
                <button
                  key={result._id}
                  type="button"
                  className="block w-full truncate rounded px-2 py-1 text-left hover:bg-muted"
                  onClick={() => {
                    setSelectedRoomId(result.roomId);
                    setMobilePanel("chat");
                    setSearchResults(null);
                    setSearchQuery("");
                  }}
                >
                  {result.body}
                </button>
              ))}
              <button type="button" className="text-primary" onClick={() => setSearchResults(null)}>
                Clear results
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {(
            [
              ["Workspace", grouped.workspace],
              ["Teams", grouped.team],
              ["Projects", grouped.project],
              ["Direct messages", grouped.direct],
            ] as const
          ).map(([label, list]) =>
            list.length === 0 ? null : (
              <div key={label}>
                <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <div className="space-y-0.5">
                  {list.map((room) => {
                    const Icon = roomTypeIcons[room.roomType];
                    return (
                      <button
                        key={room._id}
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(room._id);
                          setMobilePanel("chat");
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          room._id === selectedRoomId ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        )}
                        aria-label={`Open ${room.name}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{room.name}</span>
                        {room.unreadCount > 0 && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {room.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ),
          )}

          <div>
            <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">People</p>
            {directory
              .filter((user) => user._id !== currentUserId)
              .slice(0, 8)
              .map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => handleStartDirectMessage(user)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  aria-label={`Start direct message with ${user.fullName}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="truncate">{user.fullName}</span>
                </button>
              ))}
          </div>
        </div>
      </Card>

      <Card
        className={cn(
          "min-h-0 flex-1 flex-col overflow-hidden",
          mobilePanel === "chat" ? "flex" : "hidden",
          "lg:flex",
        )}
      >
        {!selectedRoom ? (
          <EmptyState icon={MessageSquare} title="No conversations yet" description="Pick a room from the left to get started." />
        ) : (
          <>
            <div className="flex items-center justify-between border-b p-4">
              <div className="min-w-0">
                <p className="font-semibold">{selectedRoom.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedRoom.roomType === "direct" ? "Private direct message" : `${selectedRoom.roomType} conversation`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {pinnedMessages.length > 0 && (
                  <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <Pin className="h-3.5 w-3.5" />
                    {pinnedMessages.length} pinned
                  </div>
                )}
                <Button className="lg:hidden" size="sm" variant="outline" onClick={() => setMobilePanel("details")}>
                  Details
                </Button>
              </div>
            </div>

            <div ref={messageListRef} className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
              {messages.length === 0 && (
                <EmptyState icon={MessageSquare} title="No messages yet" description="Say hello to get the conversation going." />
              )}
              {messages.map((message) => {
                const isOwn = sameId(message.authorId, currentUserId);
                const reactionCounts = message.reactions.reduce<Record<string, number>>((acc, reaction) => {
                  acc[reaction.emoji] = (acc[reaction.emoji] ?? 0) + 1;
                  return acc;
                }, {});

                return (
                  <div
                    key={message._id}
                    className={cn("group flex flex-col gap-1", isOwn ? "items-end" : "items-start")}
                  >
                    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", isOwn && "justify-end")}>
                      <span className="font-medium text-foreground">{getAuthorName(message.authorId)}</span>
                      <span>{formatTime(message.createdAt)}</span>
                      {message.isPinned && <Pin className="h-3 w-3 text-primary" />}
                    </div>
                    <p
                      className={cn(
                        "max-w-[85%] break-words rounded-lg px-3 py-2 text-sm sm:max-w-2xl",
                        isOwn ? "rounded-br-sm bg-primary/10 text-foreground" : "rounded-bl-sm bg-muted/60",
                      )}
                    >
                      {renderBody(message.body, directory)}
                    </p>
                    {message.attachments.map((attachment) => (
                      <a
                        key={attachment.url}
                        href={resolveCollaborationAssetUrl(attachment.url)}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "flex w-fit items-center gap-1 rounded-md border px-2 py-1 text-xs text-primary hover:bg-muted",
                          isOwn && "self-end",
                        )}
                      >
                        <Paperclip className="h-3 w-3" /> {attachment.fileName}
                      </a>
                    ))}
                    <div
                      className={cn(
                        "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                        isOwn && "justify-end",
                      )}
                    >
                      {quickReactions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => react(message._id, emoji).catch(() => undefined)}
                          className="rounded px-1 text-sm hover:bg-muted"
                          aria-label={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => pin(message._id, !message.isPinned).catch((error) => toast({ title: "Could not pin", description: error.message, type: "error" }))}
                        className="rounded p-1 hover:bg-muted"
                        aria-label={message.isPinned ? "Unpin message" : "Pin message"}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      {isOwn && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(message._id)}
                          className="rounded p-1 hover:bg-muted"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {Object.entries(reactionCounts).length > 0 && (
                      <div className={cn("flex gap-1 text-xs", isOwn && "justify-end")}>
                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                          <span key={emoji} className="rounded-full bg-muted px-2 py-0.5">
                            {emoji} {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="relative border-t p-2 sm:p-3">
              {mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-3 mb-1 w-56 rounded-md border bg-popover p-1 shadow-lg">
                  {mentionSuggestions.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => insertMention(user)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
                    >
                      <AtSign className="h-3 w-3" /> {user.fullName}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <label className="cursor-pointer rounded-md p-2 hover:bg-muted">
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleAttachment(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                <Input
                  value={composerText}
                  onChange={(event) => handleComposerChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Message... use @ to mention someone"
                />
                <Button size="icon" onClick={handleSend} aria-label="Send message">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card
        className={cn(
          "min-h-0 w-full shrink-0 flex-col overflow-hidden lg:flex lg:w-80",
          mobilePanel === "details" ? "flex" : "hidden",
        )}
      >
        <div className="flex border-b">
          {(["notes", "documents", "activity"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRightTab(tab)}
              className={cn(
                "flex-1 border-b-2 px-3 py-2 text-xs font-semibold capitalize transition-colors",
                rightTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!selectedRoom ? (
            <p className="text-xs text-muted-foreground">Select a conversation to see details.</p>
          ) : rightTab === "notes" ? (
            <div className="flex h-full flex-col gap-2">
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                className="min-h-40 flex-1 rounded-md border bg-background/80 p-2 text-sm"
                placeholder="Shared notes for this room..."
              />
              <Button size="sm" onClick={handleSaveNote}>
                Save note
              </Button>
              {note?.lastEditedBy && <p className="text-[11px] text-muted-foreground">Last edited by {note.lastEditedBy.slice(-6)}</p>}
            </div>
          ) : rightTab === "documents" ? (
            <div className="space-y-2">
              {attachmentsInRoom.length === 0 && <p className="text-xs text-muted-foreground">No shared documents yet.</p>}
              {attachmentsInRoom.map(({ attachment, message }) => (
                <a
                  key={attachment.url}
                  href={resolveCollaborationAssetUrl(attachment.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border p-2 text-xs hover:bg-muted"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{attachment.fileName}</span>
                  <span className="text-muted-foreground">{formatTime(message.createdAt)}</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {activityEvents.length === 0 && <p className="text-xs text-muted-foreground">No recent activity.</p>}
              {activityEvents.map((event) => (
                <div key={event.id} className="flex gap-2 text-xs">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">{event.label}</p>
                    <p className="text-muted-foreground">{event.detail}</p>
                    <p className="text-[10px] text-muted-foreground">{formatTime(event.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
