type RuntimeConfig = {
  API_BASE_URL?: string;
  VITE_API_BASE_URL?: string;
  VITE_API_URL?: string;
};

declare global {
  interface Window {
    __AI_BOS_CONFIG__?: RuntimeConfig;
    electronAPI?: {
      config?: RuntimeConfig;
      ensureDeviceEnrollment?: (
        accessToken: string,
        active?: boolean,
      ) => Promise<{
        state:
          | "enrolled"
          | "bootstrap_pending"
          | "recovery_pending";
      }>;
    };
  }
}

function getRuntimeConfigs(): RuntimeConfig[] {
  if (typeof window === "undefined") {
    return [];
  }

  return [
    window.electronAPI?.config,
    window.__AI_BOS_CONFIG__,
  ].filter(
    (
      config,
    ): config is RuntimeConfig =>
      Boolean(config),
  );
}

function readDevApiBaseUrl():
  | string
  | undefined {
  if (!import.meta.env.DEV) {
    return undefined;
  }

  return (
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL
  );
}

function normalizeApiBaseUrl(
  value?: string,
): string | undefined {
  const trimmed = value?.trim();

  if (
    !trimmed ||
    /^REPLACE_WITH_/i.test(trimmed)
  ) {
    return undefined;
  }

  return trimmed.replace(/\/+$/, "");
}

function readRuntimeApiBaseUrl():
  | string
  | undefined {
  for (const config of getRuntimeConfigs()) {
    const resolved =
      normalizeApiBaseUrl(
        config.API_BASE_URL,
      ) ??
      normalizeApiBaseUrl(
        config.VITE_API_BASE_URL,
      ) ??
      normalizeApiBaseUrl(
        config.VITE_API_URL,
      );

    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

export function getApiBaseUrl(): string {
  const runtimeApiBaseUrl = readRuntimeApiBaseUrl();

  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  const devApiBaseUrl = normalizeApiBaseUrl(readDevApiBaseUrl());

  if (devApiBaseUrl) {
    return devApiBaseUrl;
  }

  if (typeof window !== "undefined") {
    if (window.electronAPI && !window.electronAPI.config?.API_BASE_URL) {
      // In Electron Desktop App, default to Main PC IP or local server
      const hostname = window.location.hostname || "127.0.0.1";
      return `http://${hostname}:5000/api/v1`;
    }

    // In Web browser (LAN or Cloudflare Tunnel)
    const { protocol, hostname, port } = window.location;
    // If running on Vite dev port (8080, 8081), point to backend port 5000 on the same host
    if (port === "8080" || port === "8081" || port === "3000") {
      return `${protocol}//${hostname}:5000/api/v1`;
    }

    // Cloudflare Tunnel: app-<domain> / admin-<domain> each map to api-<domain> (see
    // CLOUDFLARE_TUNNEL_SETUP.md's ingress rules — the API has its own subdomain, not a port).
    const tunnelMatch = /^(app|admin)-(.+)$/.exec(hostname);
    if (tunnelMatch) {
      return `${protocol}//api-${tunnelMatch[2]}/api/v1`;
    }
  }

  return "/api/v1";
}

export function getApiOrigin(): string {
  return getApiBaseUrl().replace(
    /\/api\/v1\/?$/,
    "",
  );
}
