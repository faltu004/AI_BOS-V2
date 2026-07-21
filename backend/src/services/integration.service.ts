import type { Integration, IntegrationLog, IntegrationHealth } from "../types/integration.types.js";

type IntegrationType = "openai" | "gemini" | "groq" | "openrouter" | "ollama" | "google_drive" | "google_calendar" | "gmail" | "slack" | "teams" | "zoom" | "github" | "jira" | "dropbox";

type IntegrationStatus = "connected" | "disconnected" | "error" | "connecting";

type IntegrationPermission = "read" | "write" | "admin";

export class IntegrationService {
  private integrations: Map<string, Integration> = new Map();
  private logs: Map<string, IntegrationLog[]> = new Map();

  async connect(integrationId: string, apiKey: string): Promise<Integration> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    integration.status = "connecting";
    integration.apiKey = apiKey;

    // Simulate connection test
    const success = Math.random() > 0.2;
    integration.status = success ? "connected" : "error";

    this.addLog(integrationId, "Connection", success ? "success" : "error", success ? "Connected successfully" : "Connection failed");

    return integration;
  }

  async disconnect(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      integration.status = "disconnected";
      integration.apiKey = undefined;
      this.addLog(integrationId, "Disconnection", "success", "Disconnected successfully");
    }
  }

  async sync(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (integration && integration.status === "connected") {
      integration.lastSync = new Date().toISOString();
      this.addLog(integrationId, "Sync", "success", `Synced at ${integration.lastSync}`);
    }
  }

  async healthCheck(integrationId: string): Promise<IntegrationHealth> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    const health: IntegrationHealth = {
      integrationId,
      status: integration.status === "connected" ? "healthy" : "unhealthy",
      latency: Math.floor(Math.random() * 100) + 10,
      lastChecked: new Date().toISOString(),
    };

    this.addLog(integrationId, "Health Check", health.status === "healthy" ? "success" : "error", `Latency: ${health.latency}ms`);

    return health;
  }

  async getIntegrations(): Promise<Integration[]> {
    return Array.from(this.integrations.values());
  }

  async getLogs(integrationId: string): Promise<IntegrationLog[]> {
    return this.logs.get(integrationId) || [];
  }

  private addLog(integrationId: string, action: string, status: "success" | "error" | "warning", message: string) {
    const log: IntegrationLog = {
      id: `log_${Date.now()}`,
      integrationId,
      action,
      status,
      message,
      timestamp: new Date().toISOString(),
    };

    const existing = this.logs.get(integrationId) || [];
    this.logs.set(integrationId, [...existing, log]);
  }
}

export const integrationService = new IntegrationService();