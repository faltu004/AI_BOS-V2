import type { ProviderDefinition } from "../types.js";

const notImplemented = { ok: false, detail: "Not yet implemented for this integration" };

export const atlassianProvider: ProviderDefinition = {
  family: "atlassian",
  authType: "oauth2",
  oauth: {
    authorizationUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    scopesByIntegration: {
      jira: ["read:jira-work", "read:jira-user"],
    },
  },
  integrations: [
    { key: "jira", name: "Jira", description: "Sync issues and projects from Jira.", category: "Developer Tools" },
  ],
  async testConnection() {
    return notImplemented;
  },
  async sync() {
    return { itemsSynced: 0, summary: notImplemented.detail };
  },
};
