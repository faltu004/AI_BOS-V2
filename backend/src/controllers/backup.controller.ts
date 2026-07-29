import fs from "node:fs/promises";
import { backupRecordRepository } from "../repositories/backup-record.repository.js";
import { backupService } from "../services/backup.service.js";
import { AppError } from "../utils/app-error.js";
import { fileController, jsonController } from "../utils/controller.js";
import type { RunBackupInput, UpdateScheduleInput } from "../validation/backup.validation.js";

export class BackupController {
  history = jsonController(200, "Backup history fetched successfully", () => backupService.listHistory());

  run = jsonController(201, "Backup started successfully", ({ req }) => {
    const input = req.body as RunBackupInput;
    return backupService.runBackup(input.type, "manual", req.user?.id);
  });

  restore = jsonController(200, "Backup restored successfully", ({ req }) =>
    backupService.restoreBackup(req.params.id, req.body.confirm === true, req.user?.id),
  );

  getSchedule = jsonController(200, "Backup schedule fetched successfully", () => backupService.getSchedule());

  updateSchedule = jsonController(200, "Backup schedule updated successfully", ({ req }) => {
    const input = req.body as UpdateScheduleInput;
    return backupService.updateSchedule(req.params.type as never, input);
  });

  download = fileController("application/octet-stream", "attachment; filename=\"backup.enc\"", async ({ req }) => {
    const record = await backupRecordRepository.findById(req.params.id);
    if (!record || !record.filePath) {
      throw new AppError("Backup not found", 404);
    }
    return fs.readFile(record.filePath);
  });
}

export const backupController = new BackupController();
