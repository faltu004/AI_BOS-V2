import type { ProviderDefinition } from "../types.js";

export const slackProvider: ProviderDefinition = {
  family: "slack",
  authType: "oauth2",
  oauth: {
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopesByIntegration: {
      slack: ["channels:read", "chat:write"],
    },
  },
  integrations: [
    { key: "slack", name: "Slack", description: "Send notifications and sync channels with Slack.", category: "Communication" },
  ],
  async testConnection(accessToken) {
    const response = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; team?: string; error?: string };
    if (!body.ok) {
      return { ok: false, detail: body.error ?? "Slack auth.test failed" };
    }
    return { ok: true, detail: body.team ? `Connected to ${body.team}` : "Connected" };
  },
  async sync(accessToken) {
    const response = await fetch("https://slack.com/api/conversations.list?limit=50", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; channels?: unknown[] };
    if (!body.ok) return { itemsSynced: 0, summary: "Slack sync failed" };
    return { itemsSynced: body.channels?.length ?? 0, summary: `${body.channels?.length ?? 0} channels visible` };
  },
};
