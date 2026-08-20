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
  const runtimeApiBaseUrl =
    readRuntimeApiBaseUrl();

  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  const devApiBaseUrl =
    normalizeApiBaseUrl(
      readDevApiBaseUrl(),
    );

  if (devApiBaseUrl) {
    return devApiBaseUrl;
  }

  if (
    typeof window !== "undefined" &&
    window.electronAPI
  ) {
    throw new Error(
      "AI BOS desktop API_BASE_URL is not configured.",
    );
  }

  return "/api/v1";
}

export function getApiOrigin(): string {
  return getApiBaseUrl().replace(
    /\/api\/v1\/?$/,
    "",
  );
}