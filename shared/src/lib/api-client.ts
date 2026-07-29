import { getApiBaseUrl } from "./env";
import { getStoredAuthSession, isSessionExpired, refreshSession } from "../auth/auth-service";

const API_BASE = getApiBaseUrl();
const DEFAULT_GET_CACHE_TTL_MS = 30_000;

type GetOptions = {
  cacheTtlMs?: number;
  signal?: AbortSignal;
};

type ApiCacheEntry<T> = {
  data?: T | null;
  expiresAt: number;
  promise?: Promise<T | null>;
};

const getCache = new Map<string, ApiCacheEntry<unknown>>();

async function getAuthHeader(): Promise<Record<string, string>> {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) {
    session = await refreshSession();
  }
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

function getCacheKey(endpoint: string) {
  const session = getStoredAuthSession();
  return `${session?.accessToken ?? "anonymous"}:${endpoint}`;
}

function clearGetCache() {
  getCache.clear();
}

/**
 * Performs a fetch with the current session's auth header. If the response is
 * a 401 (token expired/invalidated server-side since our last check), refreshes
 * the session once and retries the request a single time before giving up.
 */
async function fetchWithAuth(endpoint: string, init: RequestInit = {}, signal?: AbortSignal): Promise<Response> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers: { ...init.headers, ...authHeader },
    signal,
  });

  if (response.status !== 401) return response;

  const refreshed = await refreshSession();
  if (!refreshed) return response;

  return fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${refreshed.accessToken}` },
    signal,
  });
}

export const apiClient = {
  get: async <T>(endpoint: string, options: GetOptions = {}): Promise<T | null> => {
    const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS;
    const cacheKey = getCacheKey(endpoint);
    const now = Date.now();
    const cached = getCache.get(cacheKey) as ApiCacheEntry<T> | undefined;

    if (cacheTtlMs > 0 && cached && cached.expiresAt > now) {
      if (cached.promise) return cached.promise;
      return cached.data ?? null;
    }

    const request = (async () => {
      try {
        const response = await fetchWithAuth(endpoint, {}, options.signal);
        if (!response.ok) return null;
        const json = await response.json();
        return json.data as T;
      } catch {
        return null;
      }
    })();

    if (cacheTtlMs > 0) {
      getCache.set(cacheKey, { expiresAt: now + cacheTtlMs, promise: request });
    }

    try {
      const data = await request;
      if (cacheTtlMs > 0 && data !== null) {
        getCache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtlMs });
      } else {
        getCache.delete(cacheKey);
      }
      return data;
    } catch {
      getCache.delete(cacheKey);
      return null;
    }
  },

  post: async <T>(endpoint: string, data: unknown): Promise<T | null> => {
    try {
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) return null;
      clearGetCache();
      const json = await response.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  put: async <T>(endpoint: string, data: unknown): Promise<T | null> => {
    try {
      const response = await fetchWithAuth(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) return null;
      clearGetCache();
      const json = await response.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  patch: async <T>(endpoint: string, data: unknown): Promise<T | null> => {
    try {
      const response = await fetchWithAuth(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) return null;
      clearGetCache();
      const json = await response.json();
      return json.data as T;
    } catch {
      return null;
    }
  },

  delete: async (endpoint: string): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(endpoint, { method: "DELETE" });
      if (response.ok) clearGetCache();
      return response.ok;
    } catch {
      return false;
    }
  },

  blob: async (endpoint: string, data: unknown): Promise<Blob | null> => {
    try {
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
