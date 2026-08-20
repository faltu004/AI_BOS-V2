import {
  getForegroundApplication,
  type ForegroundApplication,
} from "./foreground-app.js";

export type ForegroundActivitySession = {
  processName: string;
  pid: number;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

type ActiveSession = {
  processName: string;
  pid: number;
  startedAt: string;
};

type StartForegroundTrackerOptions = {
  pollIntervalMs?: number;

  onSessionCompleted?: (
    session: ForegroundActivitySession,
  ) => void;
};

const IDLE_SESSION_THRESHOLD_SECONDS = 300;

function calculateDurationSeconds(
  startedAt: string,
  endedAt: string,
): number {
  const start =
    new Date(
      startedAt,
    ).getTime();

  const end =
    new Date(
      endedAt,
    ).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Number(
      (
        (end - start) /
        1000
      ).toFixed(
        2,
      ),
    ),
  );
}

function completeSession(
  current: ActiveSession,
  endedAt: string,
): ForegroundActivitySession {
  return {
    processName:
      current.processName,

    pid:
      current.pid,

    startedAt:
      current.startedAt,

    endedAt,

    durationSeconds:
      calculateDurationSeconds(
        current.startedAt,
        endedAt,
      ),
  };
}

export function startForegroundActivityTracker({
  pollIntervalMs = 2_000,
  onSessionCompleted,
}: StartForegroundTrackerOptions = {}): () => void {
  let currentSession:
    ActiveSession | null =
      null;

  let requestRunning =
    false;

  let stopped =
    false;

  async function poll():
  Promise<void> {
    if (
      stopped ||
      requestRunning
    ) {
      return;
    }

    requestRunning =
      true;

    try {
      const foreground =
        await getForegroundApplication();

      if (!foreground) {
        return;
      }

      if (
        typeof foreground.idleSeconds === "number" &&
        foreground.idleSeconds >= IDLE_SESSION_THRESHOLD_SECONDS
      ) {
        if (currentSession) {
          onSessionCompleted?.(
            completeSession(
              currentSession,
              foreground.capturedAt,
            ),
          );
          currentSession = null;
        }

        return;
      }

      if (!currentSession) {
        currentSession = {
          processName:
            foreground.processName,

          pid:
            foreground.pid,

          startedAt:
            foreground.capturedAt,
        };

        return;
      }

      const sameApplication =
        currentSession
          .processName
          .toLowerCase() ===
        foreground
          .processName
          .toLowerCase();

      if (
        sameApplication
      ) {
        currentSession.pid =
          foreground.pid;

        return;
      }

      const completed =
        completeSession(
          currentSession,
          foreground.capturedAt,
        );

      onSessionCompleted?.(
        completed,
      );

      currentSession = {
        processName:
          foreground.processName,

        pid:
          foreground.pid,

        startedAt:
          foreground.capturedAt,
      };
    } catch (error) {
      console.error(
        "[Foreground Tracker] Poll failed:",
        error,
      );
    } finally {
      requestRunning =
        false;
    }
  }

  void poll();

  const timer =
    setInterval(
      () => {
        void poll();
      },
      pollIntervalMs,
    );

  return () => {
    stopped =
      true;

    clearInterval(
      timer,
    );

    if (
      currentSession
    ) {
      const endedAt =
        new Date()
          .toISOString();

      const completed =
        completeSession(
          currentSession,
          endedAt,
        );

      onSessionCompleted?.(
        completed,
      );

      currentSession =
        null;
    }
  };
}

async function runTest():
Promise<void> {
  console.log("");
  console.log(
    "AI BOS Foreground Activity Tracker",
  );

  console.log(
    "Switch between apps during this 30 second test.",
  );

  console.log("");

  const stopTracker =
    startForegroundActivityTracker(
      {
        pollIntervalMs:
          2_000,

        onSessionCompleted:
          (
            session,
          ) => {
            console.log(
              "[Session]",
              session.processName,
              "| PID",
              session.pid,
              "| Active",
              session.durationSeconds,
              "seconds",
            );
          },
      },
    );

  await new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        30_000,
      );
    },
  );

  stopTracker();

  console.log("");
  console.log(
    "Foreground activity tracker test finished.",
  );
}

if (
  process.argv.includes(
    "--test",
  )
) {
  runTest().catch(
    (
      error: unknown,
    ) => {
      console.error(
        "Foreground activity tracker failed:",
        error,
      );

      process.exitCode =
        1;
    },
  );
}
