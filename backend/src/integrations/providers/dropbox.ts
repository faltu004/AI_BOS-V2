import type { ProviderDefinition } from "../types.js";

const notImplemented = { ok: false, detail: "Not yet implemented for this integration" };

export const dropboxProvider: ProviderDefinition = {
  family: "dropbox",
  authType: "oauth2",
  oauth: {
    authorizationUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    scopesByIntegration: {
      dropbox: ["files.metadata.read"],
    },
  },
  integrations: [
    { key: "dropbox", name: "Dropbox", description: "Access and sync files from Dropbox.", category: "File Storage" },
  ],
  async testConnection() {
    return notImplemented;
  },
  async sync() {
    return { itemsSynced: 0, summary: notImplemented.detail };
  },
};
