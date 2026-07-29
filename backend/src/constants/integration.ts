export const integrationFamilies = [
  "google",
  "microsoft",
  "slack",
  "zoom",
  "github",
  "gitlab",
  "atlassian",
  "dropbox",
  "whatsapp",
] as const;
export type IntegrationFamily = (typeof integrationFamilies)[number];

export const integrationKeys = [
  "google_calendar",
  "google_drive",
  "gmail",
  "microsoft_outlook",
  "microsoft_teams",
  "onedrive",
  "slack",
  "zoom",
  "github",
  "gitlab",
  "jira",
  "dropbox",
  "whatsapp_business",
] as const;
export type IntegrationKey = (typeof integrationKeys)[number];

export const integrationStatuses = ["connected", "disconnected", "error", "connecting"] as const;
export type IntegrationStatus = (typeof integrationStatuses)[number];

export const integrationSyncFrequencies = ["realtime", "hourly", "daily", "weekly", "manual"] as const;
export type IntegrationSyncFrequency = (typeof integrationSyncFrequencies)[number];

export const integrationLogActions = ["connect", "disconnect", "sync", "health_check", "error"] as const;
export type IntegrationLogAction = (typeof integrationLogActions)[number];

export const integrationLogStatuses = ["success", "error", "warning"] as const;
export type IntegrationLogStatus = (typeof integrationLogStatuses)[number];
