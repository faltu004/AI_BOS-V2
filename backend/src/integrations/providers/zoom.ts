import type { ProviderDefinition } from "../types.js";

const notImplemented = { ok: false, detail: "Not yet implemented for this integration" };

export const zoomProvider: ProviderDefinition = {
  family: "zoom",
  authType: "oauth2",
  oauth: {
    authorizationUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    scopesByIntegration: {
      zoom: ["meeting:read"],
    },
  },
  integrations: [
    { key: "zoom", name: "Zoom", description: "Sync meetings and recordings from Zoom.", category: "Communication" },
  ],
  async testConnection() {
    return notImplemented;
  },
  async sync() {
    return { itemsSynced: 0, summary: notImplemented.detail };
  },
};
