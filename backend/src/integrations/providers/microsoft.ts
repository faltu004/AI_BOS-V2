import type { ProviderDefinition } from "../types.js";

const notImplemented = { ok: false, detail: "Not yet implemented for this integration" };

export const microsoftProvider: ProviderDefinition = {
  family: "microsoft",
  authType: "oauth2",
  oauth: {
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopesByIntegration: {
      microsoft_outlook: ["Mail.Read", "Calendars.Read"],
      microsoft_teams: ["Team.ReadBasic.All", "Channel.ReadBasic.All"],
      onedrive: ["Files.Read"],
    },
  },
  integrations: [
    { key: "microsoft_outlook", name: "Microsoft Outlook", description: "Sync mail and calendar from Outlook.", category: "Calendar & Email" },
    { key: "microsoft_teams", name: "Microsoft Teams", description: "Sync channels and messages from Teams.", category: "Communication" },
    { key: "onedrive", name: "OneDrive", description: "Access and sync files from OneDrive.", category: "File Storage" },
  ],
  async testConnection() {
    return notImplemented;
  },
  async sync() {
    return { itemsSynced: 0, summary: notImplemented.detail };
  },
};
