import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { memoryStore } from "./memory.store";
import type { MemoryItem, MemoryQuery, MemorySettings, MemoryStats } from "./memory.types";

type MemoryContextValue = {
  items: MemoryItem[];
  stats: MemoryStats | null;
  isLoading: boolean;
  error: string | null;
  settings: MemorySettings;
  fetchItems: (query?: MemoryQuery) => Promise<void>;
  fetchStats: () => Promise<void>;
  createItem: (item: Omit<MemoryItem, "id" | "created_at" | "updated_at">) => Promise<MemoryItem | null>;
  updateItem: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearAll: (type?: string) => Promise<void>;
  exportMemory: (types: string[], format: string) => Promise<Blob | null>;
  search: (query: string) => Promise<MemoryItem[]>;
  updateSettings: (settings: Partial<MemorySettings>) => void;
};

const MemoryContext = createContext<MemoryContextValue | null>(null);

const defaultSettings: MemorySettings = {
  enabled: true,
  autoSaveConversations: true,
  trackBusinessContext: true,
  semanticSearchEnabled: true,
  retentionDays: 30,
};

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within MemoryProvider");
  return ctx;
}

type MemoryProviderProps = {
  children: ReactNode;
};

export function MemoryProvider({ children }: MemoryProviderProps) {
  const [settings, setSettings] = useState<MemorySettings>(() => {
    try {
      const stored = localStorage.getItem("ai_bos_memory_settings");
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem("ai_bos_memory_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<MemorySettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const value: MemoryContextValue = {
    items: memoryStore.items,
    stats: memoryStore.stats,
    isLoading: memoryStore.isLoading,
    error: memoryStore.error,
    settings,
    fetchItems: memoryStore.fetchItems,
    fetchStats: memoryStore.fetchStats,
    createItem: memoryStore.createItem,
    updateItem: memoryStore.updateItem,
    deleteItem: memoryStore.deleteItem,
    clearAll: memoryStore.clearAll,
    exportMemory: memoryStore.exportMemory,
    search: memoryStore.search,
    updateSettings,
  };

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}