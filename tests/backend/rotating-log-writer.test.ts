import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

function makeTempDir(): string {
  return mkdtempSync(path.join(tmpdir(), "aibos-log-writer-"));
}

test("rotating log writer keeps writing to a single file below the size threshold", async () => {
  const { RotatingLogWriter } = await import(
    "../../backend/src/utils/rotating-log-writer.ts"
  );

  const dir = makeTempDir();

  try {
    const writer = new RotatingLogWriter({
      directory: dir,
      fileName: "app.log",
      maxSizeBytes: 1024 * 1024,
      maxFiles: 3,
    });

    await new Promise<void>((resolve, reject) => {
      writer.write("line one\n", (error) => (error ? reject(error) : resolve()));
    });

    await new Promise<void>((resolve, reject) => {
      writer.write("line two\n", (error) => (error ? reject(error) : resolve()));
    });

    await new Promise<void>((resolve, reject) => {
      writer.end((error?: Error | null) => (error ? reject(error) : resolve()));
    });

    const files = readdirSync(dir);
    assert.deepEqual(files, ["app.log"]);

    const content = readFileSync(path.join(dir, "app.log"), "utf8");
    assert.match(content, /line one/);
    assert.match(content, /line two/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rotating log writer rotates when the size threshold is exceeded and enforces max file count", async () => {
  const { RotatingLogWriter } = await import(
    "../../backend/src/utils/rotating-log-writer.ts"
  );

  const dir = makeTempDir();

  try {
    const writer = new RotatingLogWriter({
      directory: dir,
      fileName: "app.log",
      maxSizeBytes: 50,
      maxFiles: 2,
    });

    const line = "x".repeat(40) + "\n";

    for (let i = 0; i < 6; i += 1) {
      await new Promise<void>((resolve, reject) => {
        writer.write(line, (error) => (error ? reject(error) : resolve()));
      });
    }

    await new Promise<void>((resolve, reject) => {
      writer.end((error?: Error | null) => (error ? reject(error) : resolve()));
    });

    const files = readdirSync(dir).sort();

    assert.equal(files.includes("app.log"), true);
    assert.equal(
      files.filter((name) => name.startsWith("app.log.")).length <= 2,
      true,
      "must never keep more than maxFiles rotated files",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
