import type { ProviderDefinition } from "../types.js";

const notImplemented = { ok: false, detail: "Not yet implemented for this integration" };

export const gitlabProvider: ProviderDefinition = {
  family: "gitlab",
  authType: "oauth2",
  oauth: {
    authorizationUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    scopesByIntegration: {
      gitlab: ["read_api", "read_user"],
    },
  },
  integrations: [
    { key: "gitlab", name: "GitLab", description: "Sync repositories, issues, and merge requests from GitLab.", category: "Developer Tools" },
  ],
  async testConnection() {
    return notImplemented;
  },
  async sync() {
    return { itemsSynced: 0, summary: notImplemented.detail };
  },
};
