export type IntegrationType =
  | "openai"
  | "gemini"
  | "groq"
  | "openrouter"
  | "ollama"
  | "google_drive"
  | "google_calendar"
  | "gmail"
  | "slack"
  | "teams"
  | "zoom"
  | "github"
  | "jira"
  | "dropbox";

export type IntegrationStatus = "connected" | "disconnected" | "error" | "connecting";

export type IntegrationPermission = "read" | "write" | "admin";

export type Integration = {
  id: string;
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  status: IntegrationStatus;
  apiKey?: string;
  permissions: IntegrationPermission[];
  syncFrequency: "realtime" | "hourly" | "daily" | "weekly" | "manual";
  lastSync?: string;
  createdAt: string;
};

export type IntegrationLog = {
  id: string;
  integrationId: string;
  timestamp: string;
  action: string;
  status: "success" | "error" | "warning";
  message: string;
};

export type IntegrationHealth = {
  integrationId: string;
  status: "healthy" | "unhealthy" | "unknown";
  latency?: number;
  lastChecked: string;
  error?: string;
};