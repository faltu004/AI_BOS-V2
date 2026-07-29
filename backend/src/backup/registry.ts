import type { BackupType } from "../constants/backup.js";
import { databaseBackupTarget } from "./targets/database.js";
import { documentsBackupTarget } from "./targets/documents.js";

export type BackupTargetDefinition = {
  key: string;
  label: string;
  run(): Promise<Buffer>;
  restore(buffer: Buffer): Promise<{ summary: string }>;
};

const targets: Record<"database" | "documents", BackupTargetDefinition> = {
  database: databaseBackupTarget,
  documents: documentsBackupTarget,
};

const fullTarget: BackupTargetDefinition = {
  key: "full",
  label: "Full backup",

  async run() {
    const bundle: Record<string, string> = {};
    for (const [key, target] of Object.entries(targets)) {
      bundle[key] = (await target.run()).toString("base64");
    }
    return Buffer.from(JSON.stringify(bundle));
  },

  async restore(buffer) {
    const bundle = JSON.parse(buffer.toString("utf8")) as Record<string, string>;
    const summaries: string[] = [];
    for (const [key, base64] of Object.entries(bundle)) {
      const target = targets[key as keyof typeof targets];
      if (!target) continue;
      const result = await target.restore(Buffer.from(base64, "base64"));
      summaries.push(`${target.label}: ${result.summary}`);
    }
    return { summary: summaries.join("; ") };
  },
};

export function getBackupTarget(type: BackupType): BackupTargetDefinition {
  return type === "full" ? fullTarget : targets[type];
}
