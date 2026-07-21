import type { MemoryItem, MemoryQuery, MemoryStats } from "./memory.types";

type MemoryState = {
  items: MemoryItem[];
  stats: MemoryStats | null;
  isLoading: boolean;
  error: string | null;
};

type MemoryActions = {
  fetchItems: (query?: MemoryQuery) => Promise<void>;
  fetchStats: () => Promise<void>;
  createItem: (item: Omit<MemoryItem, "id" | "created_at" | "updated_at">) => Promise<MemoryItem | null>;
  updateItem: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearAll: (type?: string) => Promise<void>;
  exportMemory: (types: string[], format: string) => Promise<Blob | null>;
  search: (query: string) => Promise<MemoryItem[]>;
  clearError: () => void;
};

const API_BASE = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://127.0.0.1:5000/api/v1";

function getAuthHeader(): Record<string, string> {
  const session = localStorage.getItem("ai_bos_auth_session");
  if (!session) return {};
  try {
    const parsed = JSON.parse(session);
    return { Authorization: `Bearer ${parsed.accessToken}` };
  } catch {
    return {};
  }
}

export function createMemoryStore(): MemoryState & MemoryActions {
  const state: MemoryState = {
    items: [],
    stats: null,
    isLoading: false,
    error: null,
  };

  return {
    ...state,

    async fetchItems(query?: MemoryQuery) {
      state.isLoading = true;
      state.error = null;
      try {
        const params = new URLSearchParams();
        if (query?.type) params.set("type", query.type);
        if (query?.category) params.set("category", query.category);
        if (query?.query) params.set("query", query.query);
        if (query?.limit) params.set("limit", String(query.limit));

        const response = await fetch(`${API_BASE}/memory?${params.toString()}`, {
          headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error("Failed to fetch memory items");
        const json = await response.json();
        state.items = json.data || [];
      } catch (error) {
        state.error = error instanceof Error ? error.message : "Unknown error";
      } finally {
        state.isLoading = false;
      }
    },

    async fetchStats() {
      try {
        const response = await fetch(`${API_BASE}/memory/stats/me`, {
          headers: getAuthHeader(),
        });
        if (!response.ok) return;
        const json = await response.json();
        state.stats = json.data;
      } catch {
        // ignore stats errors
      }
    },

    async createItem(item) {
      try {
        const response = await fetch(`${API_BASE}/memory`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(item),
        });
        if (!response.ok) return null;
        const json = await response.json();
        const created = json.data as MemoryItem;
        state.items = [created, ...state.items];
        return created;
      } catch {
        return null;
      }
    },

    async updateItem(id, updates) {
      try {
        const response = await fetch(`${API_BASE}/memory/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(updates),
        });
        if (!response.ok) return;
        const json = await response.json();
        const updated = json.data as MemoryItem;
        state.items = state.items.map((item) => (item.id === id ? updated : item));
      } catch {
        // ignore update errors
      }
    },

    async deleteItem(id) {
      try {
        const response = await fetch(`${API_BASE}/memory/${id}`, {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        if (!response.ok) return;
        state.items = state.items.filter((item) => item.id !== id);
      } catch {
        // ignore delete errors
      }
    },

    async clearAll(type) {
      try {
        const response = await fetch(`${API_BASE}/memory`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({ type }),
        });
        if (!response.ok) return;
        if (type) {
          state.items = state.items.filter((item) => item.type !== type);
        } else {
          state.items = [];
        }
      } catch {
        // ignore clear errors
      }
    },

    async exportMemory(types, format) {
      try {
        const response = await fetch(`${API_BASE}/memory/export`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({ types, format }),
        });
        if (!response.ok) return null;
        const blob = await response.blob();
        return blob;
      } catch {
        return null;
      }
    },

    async search(query) {
      try {
        const params = new URLSearchParams({ q: query, limit: "10" });
        const response = await fetch(`${API_BASE}/memory/search?${params.toString()}`, {
          headers: getAuthHeader(),
        });
        if (!response.ok) return [];
        const json = await response.json();
        return (json.data || []) as MemoryItem[];
      } catch {
        return [];
      }
    },

    clearError() {
      state.error = null;
    },
  };
}

export const memoryStore = createMemoryStore();