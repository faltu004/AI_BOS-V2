import os from "node:os";

import {
  getForegroundApplication,
  type ForegroundApplication,
} from "./foreground-app.js";

export type SessionTelemetryState =
  | "active"
  | "unavailable";

export type SessionTelemetry = {
  deviceId: string;
  currentUser: string;
  sessionState: SessionTelemetryState;
  currentApplication: ForegroundApplication | null;
  collectedAt: string;
  publishedAt?: string;
};

const telemetryTtlMs =
  45_000;

let latestTelemetry:
  SessionTelemetry |
  null =
    null;

function cleanString(
  value: unknown,
  maxLength: number,
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function parseDate(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? null
    : parsed.toISOString();
}

function normalizeApplication(
  value: unknown,
): ForegroundApplication | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const raw =
    value as {
      processName?: unknown;
      pid?: unknown;
      capturedAt?: unknown;
    };

  const processName =
    cleanString(
      raw.processName,
      300,
    );

  const pid =
    typeof raw.pid === "number" &&
    Number.isInteger(raw.pid) &&
    raw.pid >= 0
      ? raw.pid
      : null;

  const capturedAt =
    parseDate(raw.capturedAt);

  if (
    !processName ||
    pid === null ||
    !capturedAt
  ) {
    return null;
  }

  return {
    processName,
    pid,
    capturedAt,
  };
}

export function normalizeSessionTelemetry(
  value: unknown,
): SessionTelemetry | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const raw =
    value as {
      deviceId?: unknown;
      currentUser?: unknown;
      sessionState?: unknown;
      currentApplication?: unknown;
      collectedAt?: unknown;
      publishedAt?: unknown;
    };

  const deviceId =
    cleanString(raw.deviceId, 100);
  const currentUser =
    cleanString(raw.currentUser, 200);
  const collectedAt =
    parseDate(raw.collectedAt);
  const publishedAt =
    raw.publishedAt === undefined
      ? undefined
      : parseDate(raw.publishedAt) ??
        undefined;

  if (
    !deviceId ||
    !currentUser ||
    !collectedAt
  ) {
    return null;
  }

  return {
    deviceId,
    currentUser,
    sessionState:
      raw.sessionState ===
      "active"
        ? "active"
        : "unavailable",
    currentApplication:
      normalizeApplication(
        raw.currentApplication,
      ),
    collectedAt,
    ...(publishedAt
      ? { publishedAt }
      : {}),
  };
}

export async function collectSessionTelemetry(
  deviceId = "local-session",
): Promise<SessionTelemetry> {
  const foreground =
    await getForegroundApplication()
      .catch(() => null);

  return {
    deviceId,
    currentUser:
      os.userInfo().username,
    sessionState:
      foreground
        ? "active"
        : "unavailable",
    currentApplication:
      foreground,
    collectedAt:
      new Date().toISOString(),
  };
}

export function updateLatestSessionTelemetry(
  telemetry: SessionTelemetry,
): void {
  latestTelemetry = telemetry;
}

export function getFreshSessionTelemetry(
  now = Date.now(),
): {
  telemetry:
    SessionTelemetry |
    null;
  stale: boolean;
} {
  if (!latestTelemetry) {
    return {
      telemetry: null,
      stale: true,
    };
  }

  const collectedAt =
    new Date(
      latestTelemetry.collectedAt,
    ).getTime();

  if (
    !Number.isFinite(collectedAt) ||
    now - collectedAt >
      telemetryTtlMs
  ) {
    return {
      telemetry: null,
      stale: true,
    };
  }

  return {
    telemetry:
      latestTelemetry,
    stale: false,
  };
}

export function clearSessionTelemetryForTest():
  void {
  latestTelemetry = null;
}

export {
  telemetryTtlMs,
};
