export type AuditCategory =
 | "login"
 | "logout"
 | "user_action"
 | "crud"
 | "permission_change"
 | "settings_change"
 | "file_activity"
 | "report_download";

export const auditCategories: AuditCategory[] = [
 "login",
 "logout",
 "user_action",
 "crud",
 "permission_change",
 "settings_change",
 "file_activity",
 "report_download",
];

export type AuditLogEntry = {
 _id: string;
 actorEmail?: string;
 actorRole?: string;
 category: AuditCategory;
 method: string;
 path: string;
 resourceType?: string;
 statusCode: number;
 success: boolean;
 createdAt: string;
};

export type BackupType = "database" | "documents" | "full";
export const backupTypes: BackupType[] = ["database", "documents", "full"];

export type BackupRecord = {
 _id: string;
 type: BackupType;
 trigger: "manual" | "automatic";
 status: "in_progress" | "completed" | "failed";
 fileSize?: number;
 isEncrypted: boolean;
 storageLocation: "local" | "s3";
 startedAt: string;
 completedAt?: string;
 errorMessage?: string;
};

export type BackupSchedule = {
 type: BackupType;
 frequency: "daily" | "weekly";
 isEnabled: boolean;
 retentionDays: number;
 nextRunAt: string;
 lastRunAt?: string;
};
