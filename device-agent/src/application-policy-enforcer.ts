import axios from "axios";
import si from "systeminformation";

import {
  config,
} from "./config.js";

type BlockedProcessPolicy = {
  ruleId: string;
  processName: string;
  displayName: string;
};

const POLICY_REFRESH_INTERVAL_MS =
  30_000;

const ENFORCEMENT_INTERVAL_MS =
  2_000;

const protectedProcessKeys =
  new Set([
    "system",
    "idle",
    "registry",
    "smss",
    "csrss",
    "wininit",
    "services",
    "lsass",
    "svchost",
    "winlogon",
    "dwm",
    "explorer",
    "taskmgr",
    "msiexec",
    "conhost",
    "node",
    "powershell",
    "pwsh",
    "cmd",
    "sihost",
    "ctfmon",
    "runtimebroker",
    "searchhost",
    "shellexperiencehost",
    "startmenuexperiencehost",
    "fontdrvhost",
    "audiodg",
  ]);

function normalizeProcessKey(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .replace(
        /\.exe$/i,
        "",
      )
      .toLowerCase();

  return normalized ||
    null;
}

function normalizeDisplayName(
  value: unknown,
  fallback: string,
): string {
  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        200,
      );

  return normalized ||
    fallback;
}

export function startApplicationPolicyEnforcer({
  deviceId,
  fetchPolicy,
  reportPolicyStatus,
}: {
  deviceId: string;
  fetchPolicy?: () => Promise<unknown>;
  reportPolicyStatus?: (
    status: "applied" | "failed",
    errorMessage?: string,
  ) => Promise<void>;
}): () => void {
  let stopped =
    false;

  let refreshing =
    false;

  let enforcing =
    false;

  let blockedProcesses =
    new Map<
      string,
      BlockedProcessPolicy
    >();

  async function refreshPolicy():
    Promise<void> {
    if (
      stopped ||
      refreshing
    ) {
      return;
    }

    refreshing =
      true;

    try {
      let data: unknown;

      if (fetchPolicy) {
        data = await fetchPolicy();
      } else {
        const { getDeviceAuthHeaders } = await import("./device-auth.js");
        const response = await axios.get(
          config.backendUrl +
            "/api/v1/devices/application-policy",
          {
            headers: {
              ...(await getDeviceAuthHeaders(deviceId)),
            },

            params: {
              deviceId,
            },

            timeout:
              10_000,
          },
        );
        data = response.data?.data;
      }

      const policyData =
        data as
          | {
              blockedProcesses?:
                unknown;
            }
          | undefined;

      if (
        !Array.isArray(
          policyData?.blockedProcesses,
        )
      ) {
        throw new Error(
          "Policy response did not contain blockedProcesses.",
        );
      }

      const next =
        new Map<
          string,
          BlockedProcessPolicy
        >();

      for (
        const item of
          policyData.blockedProcesses
      ) {
        if (
          typeof item !== "object" ||
          item === null ||
          Array.isArray(item)
        ) {
          continue;
        }

        const record =
          item as Record<
            string,
            unknown
          >;

        const processKey =
          normalizeProcessKey(
            record.processName,
          );

        if (
          !processKey ||
          protectedProcessKeys.has(
            processKey,
          )
        ) {
          continue;
        }

        const processName =
          typeof record.processName ===
          "string"
            ? record.processName
                .trim()
                .replace(
                  /\.exe$/i,
                  "",
                )
            : processKey;

        const ruleId =
          typeof record.ruleId ===
          "string"
            ? record.ruleId
                .trim()
                .slice(
                  0,
                  100,
                )
            : "";

        next.set(
          processKey,
          {
            ruleId,
            processName,

            displayName:
              normalizeDisplayName(
                record.displayName,
                processName,
              ),
          },
        );
      }

      blockedProcesses =
        next;

      void reportPolicyStatus?.("applied");

      console.log(
        "[App Policy] Policy refreshed. Blocked applications: " +
          blockedProcesses.size,
      );
    } catch (error) {
      void reportPolicyStatus?.(
        "failed",
        error instanceof Error
          ? error.message
          : "Application policy refresh failed",
      );

      if (
        axios.isAxiosError(
          error,
        )
      ) {
        console.error(
          "[App Policy] Policy refresh failed:",
          error.response?.data ??
            error.message,
        );
      } else {
        console.error(
          "[App Policy] Policy refresh failed:",
          error,
        );
      }
    } finally {
      refreshing =
        false;
    }
  }

  async function enforcePolicy():
    Promise<void> {
    if (
      stopped ||
      enforcing ||
      blockedProcesses.size ===
        0
    ) {
      return;
    }

    enforcing =
      true;

    try {
      const processSnapshot =
        await si.processes();

      for (
        const runningProcess of
          processSnapshot.list
      ) {
        if (stopped) {
          return;
        }

        const pid =
          runningProcess.pid;

        if (
          !Number.isInteger(pid) ||
          pid <= 0 ||
          pid === process.pid
        ) {
          continue;
        }

        const processKey =
          normalizeProcessKey(
            runningProcess.name,
          );

        if (!processKey) {
          continue;
        }

        if (
          protectedProcessKeys.has(
            processKey,
          )
        ) {
          continue;
        }

        const policy =
          blockedProcesses.get(
            processKey,
          );

        if (!policy) {
          continue;
        }

        try {
          process.kill(
            pid,
            "SIGTERM",
          );

          console.log(
            "[App Policy] Restricted application terminated: " +
              policy.displayName +
              " (PID " +
              pid +
              ")",
          );
        } catch (error) {
          const code =
            typeof error ===
              "object" &&
            error !== null &&
            "code" in error
              ? String(
                  (
                    error as {
                      code?: unknown;
                    }
                  ).code ??
                    "",
                )
              : "";

          if (
            code !== "ESRCH"
          ) {
            console.error(
              "[App Policy] Unable to terminate restricted application " +
                policy.displayName +
                " (PID " +
                pid +
                "):",
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "[App Policy] Enforcement scan failed:",
        error,
      );
    } finally {
      enforcing =
        false;
    }
  }

  void refreshPolicy()
    .then(
      () => {
        void enforcePolicy();
      },
    );

  const policyTimer =
    setInterval(
      () => {
        void refreshPolicy();
      },
      POLICY_REFRESH_INTERVAL_MS,
    );

  const enforcementTimer =
    setInterval(
      () => {
        void enforcePolicy();
      },
      ENFORCEMENT_INTERVAL_MS,
    );

  return () => {
    stopped =
      true;

    clearInterval(
      policyTimer,
    );

    clearInterval(
      enforcementTimer,
    );

    blockedProcesses.clear();
  };
}

