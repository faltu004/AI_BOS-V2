import type { MemoryItem, MemoryQuery, MemoryStats } from "@/features/memory/memory.types";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const API_BASE = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

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

function getStoredAuthSession() {
  const session = localStorage.getItem("ai_bos_auth_session");
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: getAuthHeader(),
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  post: async <T>(endpoint: string, data: unknown): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  put: async <T>(endpoint: string, data: unknown): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  patch: async <T>(endpoint: string, data: unknown): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  delete: async (endpoint: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  blob: async (endpoint: string, data: unknown): Promise<Blob | null> => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) return null;
      return await response.blob();
    } catch {
      return null;
    }
  },
};

export { getStoredAuthSession };