import { BackupRecordModel } from "../models/backup-record.model.js";
import type { BackupTrigger, BackupType } from "../constants/backup.js";

export class BackupRecordRepository {
  async create(type: BackupType, trigger: BackupTrigger, createdBy?: string) {
    return BackupRecordModel.create({ type, trigger, status: "in_progress", startedAt: new Date(), createdBy });
  }

  async findById(id: string) {
    return BackupRecordModel.findById(id);
  }

  async markCompleted(id: string, data: { filePath: string; fileSize: number; checksum: string }) {
    return BackupRecordModel.findByIdAndUpdate(
      id,
      { $set: { status: "completed", completedAt: new Date(), ...data } },
      { new: true },
    ).lean();
  }

  async markFailed(id: string, errorMessage: string) {
    return BackupRecordModel.findByIdAndUpdate(
      id,
      { $set: { status: "failed", completedAt: new Date(), errorMessage } },
      { new: true },
    ).lean();
  }

  async listHistory(limit = 50) {
    return BackupRecordModel.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  }
}

export const backupRecordRepository = new BackupRecordRepository();
