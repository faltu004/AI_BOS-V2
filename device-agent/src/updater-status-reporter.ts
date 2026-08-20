import axios from "axios";
import dotenv from "dotenv";

import {
  readFile,
} from "node:fs/promises";

import path from "node:path";

import {
  getAgentInstallRoot,
} from "./agent-update-paths.js";

import {
  config,
} from "./config.js";

import type {
  AgentUpdateLifecycleStatus,
} from "./agent-update-status-reporter.js";

type UpdaterStatusReport = {
  status: AgentUpdateLifecycleStatus;
  fromVersion?: string | null;
  toVersion?: string | null;
  packageId?: string | null;
  failureCategory?: string | null;
  safeErrorText?: string | null;
  metadata?: Record<string, unknown> | null;
};

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function safeErrorText(
  value: unknown,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text =
    value instanceof Error
      ? value.message
      : String(value);

  return text
    .replace(
      /[^\x20-\x7E]/g,
      " ",
    )
    .slice(
      0,
      500,
    );
}

async function loadInstalledCredential():
  Promise<{
    deviceId: string;
    deviceToken: string;
  }> {
  const envPath =
    path.join(
      getAgentInstallRoot(),
      "agent",
      ".env",
    );

  const parsed =
    dotenv.parse(
      await readFile(
        envPath,
        "utf8",
      ),
    );

  const deviceId =
    clean(
      parsed.DEVICE_ID,
    );

  const deviceToken =
    clean(
      parsed.DEVICE_TOKEN,
    );

  if (
    !deviceId ||
    !deviceToken.startsWith(
      "aibos_device_",
    )
  ) {
    throw new Error(
      "Updater cannot load per-device credential",
    );
  }

  return {
    deviceId,
    deviceToken,
  };
}

export async function tryReportUpdaterStatus(
  input: UpdaterStatusReport,
): Promise<void> {
  try {
    const credential =
      await loadInstalledCredential();

    await axios.post(
      config.backendUrl +
        "/api/v1/devices/agent-update/status",
      {
        deviceId:
          credential.deviceId,
        status:
          input.status,
        fromVersion:
          input.fromVersion ??
          null,
        toVersion:
          input.toVersion ??
          null,
        packageId:
          input.packageId ??
          null,
        failureCategory:
          input.failureCategory ??
          null,
        safeErrorText:
          safeErrorText(
            input.safeErrorText,
          ),
        metadata:
          input.metadata ??
          null,
        reportedAt:
          new Date().toISOString(),
      },
      {
        headers: {
          "Content-Type":
            "application/json",
          "x-device-id":
            credential.deviceId,
          "x-device-token":
            credential.deviceToken,
        },
        timeout:
          10_000,
        maxRedirects:
          0,
        validateStatus:
          (status) =>
            status >= 200 &&
            status < 300,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "[Agent Updater] Status report failed: " +
        (
          safeErrorText(
            error,
          ) ??
          "Unknown error"
        ),
    );
  }
}
