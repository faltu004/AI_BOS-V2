import {
  mkdir,
  open,
  readFile,
  unlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SESSION_HELPER_DIRECTORY =
  path.join(
    "AI BOS",
    "SessionHelper",
  );

const SESSION_HELPER_LOCK_NAME =
  ".session-helper-instance.lock";

function sessionHelperRoot(): string {
  const localAppData =
    process.env.LOCALAPPDATA
      ?.trim();

  return path.join(
    localAppData ||
      path.join(
        os.homedir(),
        "AppData",
        "Local",
      ),
    SESSION_HELPER_DIRECTORY,
  );
}

export function sessionHelperInstanceLockPath(): string {
  return path.join(
    sessionHelperRoot(),
    SESSION_HELPER_LOCK_NAME,
  );
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
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code =
      (error as NodeJS.ErrnoException)
        ?.code;

    if (code === "ESRCH") {
      return false;
    }

    // EPERM means that the process exists but cannot be signalled.
    return true;
  }
}

export type SessionHelperInstanceLock = {
  release: () => Promise<void>;
};

export async function acquireSessionHelperInstanceLock():
  Promise<SessionHelperInstanceLock | null> {
  const root = sessionHelperRoot();
  const lockPath =
    sessionHelperInstanceLockPath();
  const owner = String(process.pid);

  await mkdir(root, {
    recursive: true,
  });

  for (
    let attempt = 0;
    attempt < 2;
    attempt += 1
  ) {
    try {
      const handle = await open(
        lockPath,
        "wx",
        0o600,
      );

      await handle.writeFile(
        owner,
        "utf8",
      );
      await handle.close();

      let released = false;

      return {
        release: async () => {
          if (released) {
            return;
          }

          released = true;

          const currentOwner =
            await readFile(
              lockPath,
              "utf8",
            )
              .then((value) =>
                value.trim(),
              )
              .catch(() => "");

          if (currentOwner === owner) {
            await unlink(lockPath)
              .catch(() => {});
          }
        },
      };
    } catch (error) {
      const code =
        (error as NodeJS.ErrnoException)
          ?.code;

      if (code !== "EEXIST") {
        throw error;
      }

      const ownerPid =
        await readFile(
          lockPath,
          "utf8",
        )
          .then((value) =>
            Number(value.trim()),
          )
          .catch(() => Number.NaN);

      if (isProcessAlive(ownerPid)) {
        return null;
      }

      await unlink(lockPath)
        .catch(() => {});
    }
  }

  return null;
}
