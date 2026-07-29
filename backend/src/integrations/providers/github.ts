import type { ProviderDefinition } from "../types.js";

export const githubProvider: ProviderDefinition = {
  family: "github",
  authType: "oauth2",
  oauth: {
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopesByIntegration: {
      github: ["repo", "read:user"],
    },
  },
  integrations: [
    { key: "github", name: "GitHub", description: "Sync repositories, issues, and pull requests from GitHub.", category: "Developer Tools" },
  ],
  async testConnection(accessToken) {
    const response = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      return { ok: false, detail: `GitHub API responded with ${response.status}` };
    }
    const body = (await response.json()) as { login?: string };
    return { ok: true, detail: body.login ? `Connected as ${body.login}` : "Connected" };
  },
  async sync(accessToken) {
    const response = await fetch("https://api.github.com/user/repos?per_page=5", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return { itemsSynced: 0, summary: `GitHub sync failed (${response.status})` };
    const body = (await response.json()) as unknown[];
    return { itemsSynced: body.length, summary: `${body.length} repositories visible` };
  },
};
