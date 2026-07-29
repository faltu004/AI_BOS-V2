import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import {
  backupStatuses,
  backupStorageLocations,
  backupTriggers,
  backupTypes,
  type BackupStatus,
  type BackupStorageLocation,
  type BackupTrigger,
  type BackupType,
} from "../constants/backup.js";

export type BackupRecord = {
  type: BackupType;
  trigger: BackupTrigger;
  status: BackupStatus;
  filePath?: string;
  fileSize?: number;
  checksum?: string;
  isEncrypted: boolean;
  storageLocation: BackupStorageLocation;
  createdBy?: Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BackupRecordDocument = HydratedDocument<BackupRecord>;

const backupRecordSchema = new Schema<BackupRecord>(
  {
    type: { type: String, enum: backupTypes, required: true },
    trigger: { type: String, enum: backupTriggers, required: true },
    status: { type: String, enum: backupStatuses, default: "in_progress" },
    filePath: { type: String, maxlength: 400 },
    fileSize: { type: Number },
    checksum: { type: String, maxlength: 128 },
    isEncrypted: { type: Boolean, default: true },
    storageLocation: { type: String, enum: backupStorageLocations, default: "local" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    errorMessage: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

backupRecordSchema.index({ type: 1, createdAt: -1 });
backupRecordSchema.index({ status: 1 });

export const BackupRecordModel = model("BackupRecord", backupRecordSchema);
