import { motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  FileText,
  MessageSquare,
  MoreVertical,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  User,
  X,
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
import { seedMemoryItems, seedMemoryStats } from "./memory.data";
import type { MemoryItem, MemoryStats } from "./memory.types";
import { memoryTypes } from "./memory.types";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBase = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

function getTypeColor(type: string) {
  switch (type) {
    case "fact":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30";
    case "context":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30";
    case "preference":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30";
    case "conversation":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30";
    case "document":
      return "bg-pink-500/10 text-pink-600 dark:text-pink-300 border-pink-500/30";
    case "note":
      return "bg-primary/10 text-primary border-primary/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "fact":
      return CheckCircle2;
    case "context":
      return Bot;
    case "preference":
      return Settings2;
    case "conversation":
      return MessageSquare;
    case "document":
      return FileText;
    case "note":
      return BookOpen;
    default:
      return User;
  }
}

function MemoryItemCard({ item, onDelete }: { item: MemoryItem; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const Icon = getTypeIcon(item.type);

  return (
    <Card className="glass h-full rounded-2xl bg-card/70 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getTypeColor(item.type)}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{item.title}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground capitalize">{item.type}</p>
            </div>
          </div>
          <div className="relative">
            <Button aria-label="More options" onClick={() => setShowMenu((v) => !v)} size="icon" type="button" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border bg-background/95 p-1 shadow-lg backdrop-blur-xl">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted text-destructive" onClick={() => { onDelete(); setShowMenu(false); }} type="button"><Trash2 className="h-4 w-4" />Delete</button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{item.content}</p>
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary" key={tag}>{tag}</span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{item.source}</span>
          <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateMemoryModal({ onClose, onCreate }: { onClose: () => void; onCreate: (item: MemoryItem) => void }) {
  const [form, setForm] = useState({ title: "", content: "", type: "note" as MemoryItem["type"], tags: "" });

  const handleSubmit = () => {
    const item: MemoryItem = {
      id: `mem-${Date.now()}`,
      type: form.type,
      title: form.title,
      content: form.content,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      source: "Manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };
    onCreate(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.div animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-glass" initial={{ opacity: 0, scale: 0.96 }}>
        <h2 className="text-xl font-bold">Create Memory</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add a new memory item to the system.</p>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MemoryItem["type"] }))}>
              {memoryTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" id="content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" placeholder="finance, q3, revenue" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
            <Button onClick={handleSubmit} type="submit">Create</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function MemoryPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [items, setItems] = useState<MemoryItem[]>(seedMemoryItems);
  const [stats, setStats] = useState<MemoryStats>(seedMemoryStats);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [isCreating, setIsCreating] = useState(false);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const searchText = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .filter((item) => type === "All" || item.type === type);
  }, [items, search, type]);

  const createMemory = (newItem: MemoryItem) => {
    setItems((current) => [newItem, ...current]);
    setStats((current) => ({ ...current, totalItems: current.totalItems + 1, lastUpdated: new Date().toISOString() }));
    toast({ title: "Memory created", description: `"${newItem.title}" has been added.`, type: "success" });
  };

  const deleteMemory = async (id: string) => {
    const accepted = await confirm({ title: "Delete memory?", description: "This memory item will be permanently removed.", confirmLabel: "Delete", tone: "danger" });
    if (!accepted) return;
    setItems((current) => current.filter((item) => item.id !== id));
    setStats((current) => ({ ...current, totalItems: current.totalItems - 1 }));
    toast({ title: "Memory deleted", type: "warning" });
  };

  const clearMemory = async () => {
    const accepted = await confirm({ title: "Clear all memory?", description: "This will permanently remove all memory items.", confirmLabel: "Clear All", tone: "danger" });
    if (!accepted) return;
    setItems([]);
    setStats({ totalItems: 0, totalTypes: {}, lastUpdated: new Date().toISOString(), storageUsed: "0 MB" });
    toast({ title: "Memory cleared", description: "All memory items have been removed.", type: "warning" });
  };

  const statCards = [
    { label: "Total Items", value: stats.totalItems, icon: BookOpen },
    { label: "Storage Used", value: stats.storageUsed, icon: FileText },
    { label: "Last Updated", value: new Date(stats.lastUpdated).toLocaleDateString(), icon: Sparkles },
  ];

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Memory</p>
            <h1 className="text-2xl font-bold">AI Memory & Context</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <ThemeToggle />
            <Button onClick={() => setIsCreating(true)}><Sparkles className="h-4 w-4" />Add Memory</Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={card.label} transition={{ delay: index * 0.04 }}>
                <Card className="glass">
                  <CardContent className="p-5">
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold">{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="glass">
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_160px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search memory..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                <option>All</option>
                {memoryTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
              <Button onClick={clearMemory} type="button" variant="outline"><Trash2 className="h-4 w-4" />Clear All</Button>
            </div>
          </CardContent>
        </Card>

        {filteredItems.length === 0 ? (
          <EmptyState action={{ label: "Add Memory", onClick: () => setIsCreating(true) }} description="No memory items match your search." icon={Bot} title="No memory found" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <MemoryItemCard key={item.id} item={item} onDelete={() => deleteMemory(item.id)} />
            ))}
          </div>
        )}
      </div>

      {isCreating && (
        <CreateMemoryModal
          onCreate={createMemory}
          onClose={() => setIsCreating(false)}
        />
      )}
    </main>
  );
}
