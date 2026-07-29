import { z } from "zod";
import { backupFrequencies, backupTypes } from "../constants/backup.js";

export const runBackupSchema = z.object({
  type: z.enum(backupTypes),
});

export const restoreBackupSchema = z.object({
  confirm: z.literal(true),
});

export const backupIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateScheduleParamsSchema = z.object({
  type: z.enum(backupTypes),
});

export const updateScheduleSchema = z.object({
  frequency: z.enum(backupFrequencies).optional(),
  isEnabled: z.boolean().optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
});

export type RunBackupInput = z.infer<typeof runBackupSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
