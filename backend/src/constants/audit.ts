export const auditCategories = [
  "login",
  "logout",
  "user_action",
  "crud",
  "ai_activity",
  "permission_change",
  "settings_change",
  "file_activity",
  "report_download",
] as const;
export type AuditCategory = (typeof auditCategories)[number];
