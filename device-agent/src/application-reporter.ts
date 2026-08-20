import axios from "axios";

import {
  getApplicationSnapshot,
} from "./applications.js";

import {
  config,
} from "./config.js";

export type ApplicationSnapshotPayload = {
  deviceId: string;
  runningApplications: Awaited<ReturnType<typeof getApplicationSnapshot>>["runningApplications"];
  installedApplications?: Awaited<ReturnType<typeof getApplicationSnapshot>>["installedApplications"];
  collectedAt: string;
  reporterSource: "agent-interactive" | "session-helper";
  sessionContext: string;
};

type StartApplicationReporterOptions = {
  deviceId: string;
  reporterSource?: "agent-interactive" | "session-helper";
  includeInstalledApplications?: boolean;
  publishSnapshot?: (payload: ApplicationSnapshotPayload) => Promise<void>;
};

const APPLICATION_REPORT_INTERVAL = 60_000;

async function publishToBackend(
  deviceId: string,
  payload: ApplicationSnapshotPayload,
): Promise<void> {
  const { getDeviceAuthHeaders } = await import("./device-auth.js");

  await axios.post(
    config.backendUrl + "/api/v1/devices/applications/snapshot",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        ...(await getDeviceAuthHeaders(deviceId)),
      },
      timeout: 45_000,
    },
  );
}

export function startApplicationReporter({
  deviceId,
  reporterSource = "agent-interactive",
  includeInstalledApplications = false,
  publishSnapshot,
}: StartApplicationReporterOptions): () => Promise<void> {
  let stopped = false;
  let currentRequest: Promise<void> | null = null;

  async function sendSnapshot(): Promise<void> {
    if (stopped) {
      return;
    }

    try {
      const snapshot = await getApplicationSnapshot();
      const payload: ApplicationSnapshotPayload = {
        deviceId,
        runningApplications: snapshot.runningApplications,
        collectedAt: snapshot.collectedAt,
        reporterSource,
        sessionContext:
          reporterSource === "session-helper"
            ? "interactive-user-session"
            : "agent-process",
        ...(includeInstalledApplications
          ? { installedApplications: snapshot.installedApplications }
          : {}),
      };

      if (publishSnapshot) {
        await publishSnapshot(payload);
      } else {
        await publishToBackend(deviceId, payload);
      }

      console.log(
        "[Applications] Snapshot sent" +
          " | Installed " +
          snapshot.installedApplications.length +
          " | Running " +
          snapshot.runningApplications.length +
          " | Source " +
          reporterSource,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "[Applications] Snapshot failed:",
          error.response?.data ?? error.message,
        );
      } else {
        console.error("[Applications] Snapshot failed:", error);
      }
    }
  }

  function triggerSnapshot(): void {
    if (stopped || currentRequest) {
      return;
    }

    currentRequest = sendSnapshot().finally(() => {
      currentRequest = null;
    });
  }

  triggerSnapshot();
  const timer = setInterval(triggerSnapshot, APPLICATION_REPORT_INTERVAL);

  return async () => {
    if (stopped) {
      return;
    }

    stopped = true;
    clearInterval(timer);
    if (currentRequest) {
      await currentRequest;
    }
  };
}
