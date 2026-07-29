function readEnv(key: string): string | undefined {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[key];
}

export function getApiBaseUrl(): string {
  return readEnv("VITE_API_BASE_URL") ?? readEnv("VITE_API_URL") ?? "http://127.0.0.1:5000/api/v1";
}
