import {
  open,
  readFile,
  unlink,
} from "node:fs/promises";

import {
  ensureProtectedAgentRoot,
  protectedAgentRoot,
} from "./agent-storage.js";

/*
 * Without this lock, a leftover/orphaned agent process (for example
 * one that survived an unclean service restart) has no way to detect
 * that a healthy instance is already running. It keeps calling
 * prepareDeviceIdentity() -> POST /devices/register forever via the
 * startup retry loop, producing an indefinite stream of
 * authentication failures against the backend while a second,
 * correctly-credentialed instance runs heartbeat/commands normally.
 * This is invisible to Windows Service Control Manager, which only
 * tracks the one process it directly spawned.
 */
const AGENT_INSTANCE_LOCK_NAME =
  ".agent-instance.lock";

function agentInstanceLockPath():
  string {
  return protectedAgentRoot +
    "\\" +
    AGENT_INSTANCE_LOCK_NAME;
}

function isProcessAlive(
  pid: number,
): boolean {
  if (
    !Number.isInteger(pid) ||
    pid <= 0
  ) {
    return false;
  }

  try {
    /*
     * Signal 0 performs no actual
     * signal delivery; it only checks
     * whether the process exists and
     * is signalable.
     */
    process.kill(
      pid,
      0,
    );

    return true;
  } catch (
    error
  ) {
    const code =
      (
        error as
          NodeJS.ErrnoException
      )?.code;

    if (code === "ESRCH") {
      return false;
    }

    /*
     * EPERM (process exists but is
     * not signalable by us) or any
     * other unexpected error: treat
     * conservatively as still alive
     * rather than risk clobbering a
     * live instance's lock.
     */
    return true;
  }
}

export type AgentInstanceLock = {
  release:
    () => Promise<void>;
};

export async function acquireAgentInstanceLock():
  Promise<AgentInstanceLock | null> {
  await ensureProtectedAgentRoot();

  const lockPath =
    agentInstanceLockPath();

  for (
    let attempt = 0;
    attempt < 2;
    attempt += 1
  ) {
    try {
      const handle =
        await open(
          lockPath,
          "wx",
          0o600,
        );

      await handle.writeFile(
        String(
          process.pid,
        ),
        "utf8",
      );

      await handle.close();

      return {
        release:
          async () => {
            await unlink(
              lockPath,
            ).catch(
              () => {},
            );
          },
      };
    } catch (
      error
    ) {
      const code =
        (
          error as
            NodeJS.ErrnoException
        )?.code;

      if (code !== "EEXIST") {
        throw error;
      }

      let ownerPid:
        number |
        null =
          null;

      try {
        const content =
          (
            await readFile(
              lockPath,
              "utf8",
            )
          ).trim();

        const parsed =
          Number(
            content,
          );

        ownerPid =
          Number.isInteger(
            parsed,
          ) &&
          parsed > 0
            ? parsed
            : null;
      } catch {
        ownerPid =
          null;
      }

      if (
        ownerPid !== null &&
        ownerPid !==
          process.pid &&
        isProcessAlive(
          ownerPid,
        )
      ) {
        return null;
      }

      /*
       * Stale lock: owner PID missing,
       * unreadable, or no longer
       * alive. Remove it and retry
       * acquisition once.
       */
      await unlink(
        lockPath,
      ).catch(
        () => {},
      );
    }
  }

  return null;
}
