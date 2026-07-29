export const backupTypes = ["database", "documents", "full"] as const;
export type BackupType = (typeof backupTypes)[number];

export const backupTriggers = ["manual", "automatic"] as const;
export type BackupTrigger = (typeof backupTriggers)[number];

export const backupStatuses = ["in_progress", "completed", "failed"] as const;
export type BackupStatus = (typeof backupStatuses)[number];

export const backupStorageLocations = ["local", "s3"] as const;
export type BackupStorageLocation = (typeof backupStorageLocations)[number];

export const backupFrequencies = ["daily", "weekly"] as const;
export type BackupFrequency = (typeof backupFrequencies)[number];
