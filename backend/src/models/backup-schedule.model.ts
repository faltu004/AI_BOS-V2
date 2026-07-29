import { model, Schema, type HydratedDocument } from "mongoose";
import { backupFrequencies, backupTypes, type BackupFrequency, type BackupType } from "../constants/backup.js";

export type BackupSchedule = {
  type: BackupType;
  frequency: BackupFrequency;
  isEnabled: boolean;
  retentionDays: number;
  nextRunAt: Date;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type BackupScheduleDocument = HydratedDocument<BackupSchedule>;

const backupScheduleSchema = new Schema<BackupSchedule>(
  {
    type: { type: String, enum: backupTypes, unique: true, required: true },
    frequency: { type: String, enum: backupFrequencies, default: "daily" },
    isEnabled: { type: Boolean, default: false },
    retentionDays: { type: Number, default: 30, min: 1, max: 365 },
    nextRunAt: { type: Date, required: true },
    lastRunAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const BackupScheduleModel = model("BackupSchedule", backupScheduleSchema);
