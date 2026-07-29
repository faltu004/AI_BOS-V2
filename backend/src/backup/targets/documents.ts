import fs from "node:fs/promises";
import path from "node:path";

const uploadsDir = path.join(process.cwd(), "uploads");

async function walk(dir: string, base: string): Promise<{ relativePath: string; base64: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: { relativePath: string; base64: string }[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, base)));
    } else {
      const content = await fs.readFile(fullPath);
      files.push({ relativePath: path.relative(base, fullPath).replace(/\\/g, "/"), base64: content.toString("base64") });
    }
  }

  return files;
}

export const documentsBackupTarget = {
  key: "documents" as const,
  label: "Documents",

  async run(): Promise<Buffer> {
    const manifest = await walk(uploadsDir, uploadsDir);
    return Buffer.from(JSON.stringify({ files: manifest }));
  },

  async restore(buffer: Buffer): Promise<{ summary: string }> {
    const { files } = JSON.parse(buffer.toString("utf8")) as { files: { relativePath: string; base64: string }[] };

    for (const file of files) {
      const destination = path.join(uploadsDir, file.relativePath);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, Buffer.from(file.base64, "base64"));
    }

    return { summary: `Restored ${files.length} files` };
  },
};
