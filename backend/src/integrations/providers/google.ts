import type { ProviderDefinition } from "../types.js";

export const googleProvider: ProviderDefinition = {
  family: "google",
  authType: "oauth2",
  oauth: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopesByIntegration: {
      google_calendar: ["https://www.googleapis.com/auth/calendar.readonly"],
      google_drive: ["https://www.googleapis.com/auth/drive.readonly"],
      gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
    },
  },
  integrations: [
    { key: "google_calendar", name: "Google Calendar", description: "Sync events and meetings from Google Calendar.", category: "Calendar & Email" },
    { key: "google_drive", name: "Google Drive", description: "Access and sync files from Google Drive.", category: "File Storage" },
    { key: "gmail", name: "Gmail", description: "Read and sync email from Gmail.", category: "Calendar & Email" },
  ],
  async testConnection(accessToken) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, detail: `Google API responded with ${response.status}` };
    }
    const body = (await response.json()) as { email?: string };
    return { ok: true, detail: body.email ? `Connected as ${body.email}` : "Connected" };
  },
  async sync(accessToken, integrationKey) {
    if (integrationKey === "google_calendar") {
      const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return { itemsSynced: 0, summary: `Calendar sync failed (${response.status})` };
      const body = (await response.json()) as { items?: unknown[] };
      return { itemsSynced: body.items?.length ?? 0, summary: `${body.items?.length ?? 0} calendars visible` };
    }

    if (integrationKey === "google_drive") {
      const response = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=5", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return { itemsSynced: 0, summary: `Drive sync failed (${response.status})` };
      const body = (await response.json()) as { files?: unknown[] };
      return { itemsSynced: body.files?.length ?? 0, summary: `${body.files?.length ?? 0} recent files` };
    }

    // gmail
    const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/labels", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return { itemsSynced: 0, summary: `Gmail sync failed (${response.status})` };
    const body = (await response.json()) as { labels?: unknown[] };
    return { itemsSynced: body.labels?.length ?? 0, summary: `${body.labels?.length ?? 0} labels visible` };
  },
};
