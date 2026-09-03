import { BackupScheduleModel } from "../models/backup-schedule.model.js";
import { backupTypes, type BackupFrequency, type BackupType } from "../constants/backup.js";

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

  /** Inserts a default schedule row for any backup type that doesn't have one yet; never overwrites an existing (possibly user-customized) schedule. */
  async seedDefaults() {
    const nextRunAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await Promise.all(
      backupTypes.map((type) =>
        BackupScheduleModel.findOneAndUpdate(
          { type },
          { $setOnInsert: { type, frequency: "daily", isEnabled: false, retentionDays: 30, nextRunAt } },
          { upsert: true, setDefaultsOnInsert: true },
        ),
      ),
    );
  }
}

export const backupScheduleRepository = new BackupScheduleRepository();
