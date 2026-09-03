import assert from "node:assert/strict";
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const testRoot = path.join(
  os.tmpdir(),
  "AI BOS Session Helper Startup Test " +
    Date.now().toString(36),
);
const originalLocalAppData =
  process.env.LOCALAPPDATA;

process.env.LOCALAPPDATA = testRoot;

const {
  acquireSessionHelperInstanceLock,
  sessionHelperInstanceLockPath,
} = await import(
  "../../device-agent/src/session-helper-instance-lock.ts"
);

test.after(async () => {
  if (originalLocalAppData === undefined) {
    delete process.env.LOCALAPPDATA;
  } else {
    process.env.LOCALAPPDATA =
      originalLocalAppData;
  }

  await rm(testRoot, {
    recursive: true,
    force: true,
  });
});

test("Session Helper per-user lock rejects duplicates and recovers a stale lock", async () => {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });

  const first =
    await acquireSessionHelperInstanceLock();
  assert.ok(first);

  const duplicate =
    await acquireSessionHelperInstanceLock();
  assert.equal(duplicate, null);

  await first.release();

  const afterRelease =
    await acquireSessionHelperInstanceLock();
  assert.ok(afterRelease);
  await afterRelease.release();

  const lockPath =
    sessionHelperInstanceLockPath();
  await mkdir(path.dirname(lockPath), {
    recursive: true,
  });
  await writeFile(
    lockPath,
    "not-a-live-pid",
    "utf8",
  );

  const afterStaleLock =
    await acquireSessionHelperInstanceLock();
  assert.ok(afterStaleLock);
  await afterStaleLock.release();
});

test("hidden supervisor and runtime retain retry behavior without shell popups", async () => {
  const [
    launcher,
    taskInstaller,
    helper,
  ] = await Promise.all([
    readFile(
      "packaging/windows/session-helper-hidden.vbs",
      "utf8",
    ),
    readFile(
      "packaging/windows/session-helper-task.ps1",
      "utf8",
    ),
    readFile(
      "device-agent/src/session-helper.ts",
      "utf8",
    ),
  ]);

  assert.match(
    launcher,
    /Do[\s\S]*shell\.Run\(command, 0, True\)[\s\S]*WScript\.Sleep RetryDelayMilliseconds[\s\S]*Loop/,
  );
  assert.doesNotMatch(
    launcher,
    /cmd\.exe|powershell\.exe/i,
  );
  assert.match(
    taskInstaller,
    /-AtLogOn/,
  );
  assert.match(
    taskInstaller,
    /-StartWhenAvailable/,
  );
  assert.match(
    taskInstaller,
    /-RestartCount 999/,
  );
  assert.match(
    taskInstaller,
    /-MultipleInstances IgnoreNew/,
  );
  assert.match(
    taskInstaller,
    /-ExecutionTimeLimit \(\[TimeSpan\]::Zero\)/,
  );
  assert.match(
    taskInstaller,
    /-LogonType Interactive[\s\S]*-RunLevel Limited/,
  );
  assert.match(
    helper,
    /acquireSessionHelperInstanceLock/,
  );
  assert.match(
    helper,
    /scheduleRetry\(\)/,
  );
});
