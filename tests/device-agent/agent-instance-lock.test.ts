import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

process.env.NODE_ENV = "test";

const testRoot = path.join(
  os.tmpdir(),
  "AI BOS Instance Lock Test " + Date.now().toString(36),
);

process.env.ProgramData = path.join(testRoot, "ProgramData");
process.env.PROGRAMDATA = process.env.ProgramData;

/*
 * agent-instance-lock.ts calls ensureProtectedAgentRoot(), which on
 * win32 applies a restrictive icacls ACL (SYSTEM + Administrators
 * only) the first time it runs in a process. In a non-elevated test
 * runner this would lock the test process itself out of the
 * directory it just created. Clearing PATH makes icacls.exe
 * unresolvable, so that step fails and is silently caught (it never
 * rethrows) instead of actually restricting permissions -- the same
 * technique already used by credential-recovery.test.ts for the same
 * underlying issue.
 */
const originalPath = process.env.PATH;
process.env.PATH = "";

/*
 * protectedAgentRoot is computed once, at module load, from
 * process.env.ProgramData. It must therefore be imported only after
 * the env vars above are set, and exactly once for this whole file --
 * re-importing with cache-busting query strings does not help here,
 * since a relative "./agent-storage.js" import from within
 * agent-instance-lock.ts always resolves to the same cached module
 * regardless of what query string the entry import used.
 */
const { acquireAgentInstanceLock } = await import(
  "../../device-agent/src/agent-instance-lock.ts"
);

const protectedRoot = path.join(
  process.env.ProgramData,
  "AI BOS",
  "DeviceAgent",
);

const lockPath = path.join(
  protectedRoot,
  ".agent-instance.lock",
);

async function resetFiles(): Promise<void> {
  await rm(testRoot, { recursive: true, force: true });
  await mkdir(protectedRoot, { recursive: true });
}

test.after(async () => {
  process.env.PATH = originalPath;
  await rm(testRoot, { recursive: true, force: true });
});

test("a fresh process acquires the instance lock and writes its own PID", async () => {
  await resetFiles();

  const lock = await acquireAgentInstanceLock();
  assert.notEqual(lock, null);

  const content = await readFile(lockPath, "utf8");
  assert.equal(content.trim(), String(process.pid));

  await lock?.release();

  await assert.rejects(readFile(lockPath, "utf8"), /ENOENT/);
});

test("a second live process is refused the lock while the first still holds it", async () => {
  await resetFiles();

  // A genuinely separate, live OS process -- not this test process's
  // own PID -- so the lock module's "is this actually a different,
  // still-running process" check is exercised for real.
  const child = spawn(
    process.execPath,
    ["-e", "setTimeout(() => {}, 10000)"],
    { stdio: "ignore" },
  );

  assert.ok(child.pid);

  try {
    await writeFile(lockPath, String(child.pid), "utf8");

    const result = await acquireAgentInstanceLock();
    assert.equal(
      result,
      null,
      "a duplicate instance must not be able to acquire the lock while the owner process is alive",
    );

    const content = await readFile(lockPath, "utf8");
    assert.equal(
      content.trim(),
      String(child.pid),
      "the existing live owner's lock must be left untouched",
    );
  } finally {
    child.kill();
  }
});

test("a stale lock left by a dead process is detected and reclaimed", async () => {
  await resetFiles();

  const child = spawn(
    process.execPath,
    ["-e", "process.exit(0)"],
    { stdio: "ignore" },
  );

  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
  });

  const deadPid = child.pid;
  assert.ok(deadPid);

  await writeFile(lockPath, String(deadPid), "utf8");

  const lock = await acquireAgentInstanceLock();
  assert.notEqual(
    lock,
    null,
    "a lock owned by a dead PID must be reclaimable, not treated as a permanent duplicate",
  );

  const content = await readFile(lockPath, "utf8");
  assert.equal(content.trim(), String(process.pid));

  await lock?.release();
});

test("releasing the lock allows immediate re-acquisition", async () => {
  await resetFiles();

  const first = await acquireAgentInstanceLock();
  assert.notEqual(first, null);
  await first?.release();

  const second = await acquireAgentInstanceLock();
  assert.notEqual(
    second,
    null,
    "after a clean release, a new instance must be able to acquire the lock",
  );

  await second?.release();
});
