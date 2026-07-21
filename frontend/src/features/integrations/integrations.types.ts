export type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing";
export type IntegrationCategory = "communication" | "crm" | "finance" | "productivity" | "storage" | "ai" | "other";

export const integrationCategories = ["communication", "crm", "finance", "productivity", "storage", "ai", "other"] as const;

export type Integration = {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  icon: string;
  connectedAt?: string;
  lastSyncAt?: string;
  config: Record<string, unknown>;
  logo?: string;
};

export type IntegrationLog = {
  id: string;
  integrationId: string;
  action: string;
  status: "success" | "failed" | "pending";
  message: string;
  timestamp: string;
};

export type IntegrationFormInput = {
  integrationId: string;
  apiKey: string;
};
