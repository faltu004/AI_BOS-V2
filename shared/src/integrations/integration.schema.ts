export type IntegrationFamily = "google" | "microsoft" | "slack" | "zoom" | "github" | "gitlab" | "atlassian" | "dropbox" | "whatsapp";
export type IntegrationStatus = "connected" | "disconnected" | "error" | "connecting";
export type IntegrationSyncFrequency = "realtime" | "hourly" | "daily" | "weekly" | "manual";

export type IntegrationCardData = {
 key: string;
 name: string;
 description: string;
 category: string;
 family: IntegrationFamily;
 authType: "oauth2" | "future_ready";
 status: IntegrationStatus;
 autoSyncEnabled: boolean;
 syncFrequency: IntegrationSyncFrequency;
 lastSyncAt?: string;
 lastSyncStatus?: "success" | "error";
 lastSyncSummary?: string;
 grantedScopes: string[];
 connectedAt?: string;
};

export type IntegrationLogEntry = {
 _id: string;
 integrationKey: string;
 action: string;
 status: "success" | "error" | "warning";
 message: string;
 createdAt: string;
};

export type ProviderConfigStatus = {
 family: IntegrationFamily;
 isConfigured: boolean;
 isEnabled: boolean;
 redirectUri?: string;
 updatedAt?: string;
};

export const integrationCategories = ["Calendar & Email", "File Storage", "Communication", "Developer Tools"];
