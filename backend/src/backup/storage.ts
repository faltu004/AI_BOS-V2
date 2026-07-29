import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const backupsDir = path.join(process.cwd(), "backups");

export type BackupStorage = {
  save(key: string, buffer: Buffer): Promise<{ filePath: string; fileSize: number; checksum: string }>;
  load(filePath: string): Promise<Buffer>;
};

/**
 * Local-disk implementation of the storage seam. A future S3/GCS
 * implementation is a second file behind this same interface — nothing
 * else in the backup system needs to change ("future cloud storage support").
 */
export const localBackupStorage: BackupStorage = {
  async save(key, buffer) {
    await fs.mkdir(backupsDir, { recursive: true });
    const filePath = path.join(backupsDir, key);
    await fs.writeFile(filePath, buffer);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    return { filePath, fileSize: buffer.length, checksum };
  },

  async load(filePath) {
    return fs.readFile(filePath);
  },
};
