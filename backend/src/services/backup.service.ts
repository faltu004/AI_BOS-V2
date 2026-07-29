import { getBackupTarget } from "../backup/registry.js";
import { localBackupStorage } from "../backup/storage.js";
import type { BackupFrequency, BackupTrigger, BackupType } from "../constants/backup.js";
import { backupRecordRepository } from "../repositories/backup-record.repository.js";
import { backupScheduleRepository } from "../repositories/backup-schedule.repository.js";
import { AppError } from "../utils/app-error.js";
import { decryptBuffer, encryptBuffer } from "../utils/crypto.js";
import { logger } from "../utils/logger.js";
import { auditLogService } from "./audit-log.service.js";

function addFrequency(date: Date, frequency: BackupFrequency): Date {
  const next = new Date(date);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  return next;
}

export class BackupService {
  async runBackup(type: BackupType, trigger: BackupTrigger, userId?: string) {
    const record = await backupRecordRepository.create(type, trigger, userId);
    const recordId = record._id.toString();

    try {
      const target = getBackupTarget(type);
      const buffer = await target.run();
      const encrypted = encryptBuffer(buffer);
      const key = `${type}-${recordId}-${Date.now()}.enc`;
      const { filePath, fileSize, checksum } = await localBackupStorage.save(key, encrypted);
      return await backupRecordRepository.markCompleted(recordId, { filePath, fileSize, checksum });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backup failed";
      await backupRecordRepository.markFailed(recordId, message);
      throw new AppError(`Backup failed: ${message}`, 500);
    }
  }

  async restoreBackup(backupId: string, confirm: boolean, userId?: string) {
    if (!confirm) {
      throw new AppError("Restoring a backup is destructive — pass confirm:true to proceed", 400);
    }

    const record = await backupRecordRepository.findById(backupId);
    if (!record || record.status !== "completed" || !record.filePath) {
      throw new AppError("Backup not found or not completed", 404);
    }

    const encrypted = await localBackupStorage.load(record.filePath);
    const buffer = decryptBuffer(encrypted);
    const target = getBackupTarget(record.type);
    const result = await target.restore(buffer);

    void auditLogService.record({
      actorUserId: userId,
      category: "user_action",
      method: "POST",
      path: `/backup/${backupId}/restore`,
      resourceType: "backup",
      resourceId: backupId,
      statusCode: 200,
      success: true,
      metadata: { action: "restore", backupType: record.type, summary: result.summary },
    });

    return result;
  }

  async listHistory() {
    return backupRecordRepository.listHistory();
  }

  async getSchedule() {
    return backupScheduleRepository.listAll();
  }

  async updateSchedule(type: BackupType, input: { frequency?: BackupFrequency; isEnabled?: boolean; retentionDays?: number }) {
    return backupScheduleRepository.upsert(type, { ...input, nextRunAt: new Date() });
  }

  async runDueSweep(now: Date) {
    const due = await backupScheduleRepository.findDue(now);
    let ran = 0;

    for (const schedule of due) {
      try {
        await this.runBackup(schedule.type, "automatic");
        ran += 1;
      } catch (error) {
        logger.error(error, `Scheduled backup failed for type "${schedule.type}"`);
      } finally {
        await backupScheduleRepository.advance(schedule.type, addFrequency(now, schedule.frequency), now);
      }
    }

    return ran;
  }
}

export const backupService = new BackupService();
