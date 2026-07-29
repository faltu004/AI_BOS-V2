import { BackupScheduleModel } from "../models/backup-schedule.model.js";
import type { BackupFrequency, BackupType } from "../constants/backup.js";

export class BackupScheduleRepository {
  async listAll() {
    return BackupScheduleModel.find({}).lean();
  }

  async findByType(type: BackupType) {
    return BackupScheduleModel.findOne({ type }).lean();
  }

  async findDue(now: Date) {
    return BackupScheduleModel.find({ isEnabled: true, nextRunAt: { $lte: now } }).lean();
  }

  async upsert(type: BackupType, data: Partial<{ frequency: BackupFrequency; isEnabled: boolean; retentionDays: number; nextRunAt: Date }>) {
    return BackupScheduleModel.findOneAndUpdate(
      { type },
      { $set: { type, ...data } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  }

  async advance(type: BackupType, nextRunAt: Date, lastRunAt: Date) {
    await BackupScheduleModel.updateOne({ type }, { $set: { nextRunAt, lastRunAt } });
  }
}

export const backupScheduleRepository = new BackupScheduleRepository();
