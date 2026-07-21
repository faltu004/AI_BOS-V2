import { useState } from "react";
import { Brain, Download, Search, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMemory } from "../MemoryProvider";
import type { MemoryItem } from "../memory.types";

type MemoryPanelProps = {
  className?: string;
};

export function MemoryPanel({ className }: MemoryPanelProps) {
  const { items, isLoading, search, clearAll, exportMemory, settings, updateSettings } = useMemory();
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showSettings, setShowSettings] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    await search(query);
  };

const handleExport = async () => {
    const blob = await exportMemory(["conversation", "fact", "preference", "context"], "json");
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memory-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear all memory? This cannot be undone.")) {
      await clearAll();
    }
  };

  const filteredItems = filterType === "all" ? items : items.filter((item) => item.type === filterType);

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Memory</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button aria-label="Search memory" onClick={handleSearch} size="icon" type="button" variant="ghost">
              <Search className="h-4 w-4" />
            </Button>
            <Button aria-label="Export memory" onClick={handleExport} size="icon" type="button" variant="ghost">
              <Download className="h-4 w-4" />
            </Button>
            <Button aria-label="Memory settings" onClick={() => setShowSettings(!showSettings)} size="icon" type="button" variant="ghost">
              <Settings className="h-4 w-4" />
            </Button>
            <Button aria-label="Clear memory" onClick={handleClear} size="icon" type="button" variant="ghost">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-4 rounded-lg border bg-card/65 p-4">
            <h4 className="mb-3 text-sm font-semibold">Memory Settings</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={settings.enabled}
                  onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  type="checkbox"
                />
                Enable Memory
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={settings.autoSaveConversations}
                  onChange={(e) => updateSettings({ autoSaveConversations: e.target.checked })}
                  type="checkbox"
                />
                Auto-save Conversations
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={settings.trackBusinessContext}
                  onChange={(e) => updateSettings({ trackBusinessContext: e.target.checked })}
                  type="checkbox"
                />
                Track Business Context
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={settings.semanticSearchEnabled}
                  onChange={(e) => updateSettings({ semanticSearchEnabled: e.target.checked })}
                  type="checkbox"
                />
                Semantic Search
              </label>
            </div>
          </div>
        )}

        <div className="mb-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search memory..."
            value={query}
          />
<select
             className="rounded-lg border bg-background px-3 py-1.5 text-sm"
             onChange={(e) => setFilterType(e.target.value)}
             value={filterType}
           >
             <option value="all">All Types</option>
             <option value="note">Notes</option>
             <option value="fact">Facts</option>
             <option value="context">Context</option>
             <option value="preference">Preferences</option>
             <option value="document">Documents</option>
             <option value="conversation">Conversations</option>
           </select>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No memory items found</p>
          ) : (
            filteredItems.map((item) => (
              <MemoryItemCard key={item.id} item={item} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MemoryItemCard({ item }: { item: MemoryItem }) {
  const { deleteItem } = useMemory();
  const title = item.title;
  const description = item.content;

  return (
    <div className="flex items-start justify-between rounded-lg border bg-card/65 p-3">
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description.slice(0, 100)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{item.type}</p>
      </div>
      <Button
        aria-label="Delete memory item"
        onClick={() => deleteItem(item.id)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
