import axios from "axios";

import {
  getDeviceAuthHeaders,
} from "./device-auth.js";

import {
  AGENT_VERSION,
} from "./agent-version.js";

import {
  config,
} from "./config.js";

export type AgentUpdateLifecycleStatus =
  | "update_available"
  | "download_started"
  | "download_verified"
  | "staging_started"
  | "staged"
  | "activation_requested"
  | "activation_started"
  | "service_stopped"
  | "payload_activated"
  | "service_started"
  | "health_pending"
  | "healthy"
  | "rollback_started"
  | "rolled_back"
  | "failed";

export type AgentUpdateStatusReport = {
  deviceId: string;
  status: AgentUpdateLifecycleStatus;
  fromVersion?: string | null;
  toVersion?: string | null;
  packageId?: string | null;
  failureCategory?: string | null;
  safeErrorText?: string | null;
  metadata?: Record<string, unknown> | null;
};

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

export async function reportAgentUpdateStatus(
  input:
    AgentUpdateStatusReport,
): Promise<void> {
  const body = {
    deviceId:
      input.deviceId,
    status:
      input.status,
    fromVersion:
      input.fromVersion ??
      AGENT_VERSION,
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
  };

  await axios.post(
    config.backendUrl +
      "/api/v1/devices/agent-update/status",
    body,
    {
      headers: {
        "Content-Type":
          "application/json",
        ...(await getDeviceAuthHeaders(
          input.deviceId,
        )),
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
}

export async function tryReportAgentUpdateStatus(
  input:
    AgentUpdateStatusReport,
): Promise<void> {
  try {
    await reportAgentUpdateStatus(
      input,
    );
  } catch (
    error
  ) {
    console.error(
      "[Agent Update] Status report failed: " +
        (
          error instanceof Error
            ? safeErrorText(error)
            : "Unknown error"
        ),
    );
  }
}
