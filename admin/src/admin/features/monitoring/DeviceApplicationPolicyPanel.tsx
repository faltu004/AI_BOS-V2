import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
} from "@shared/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/ui/card";

import {
  fetchDeviceApplications,
  fetchDeviceApplicationPolicy,
  setDeviceApplicationPolicy,
  type DeviceApplicationPolicyRule,
  type RunningApplication,
} from "./monitoring.api";

type DeviceApplicationPolicyPanelProps = {
  deviceId: string;
  token: string | undefined;
};

type PolicyRow = {
  processKey: string;
  processName: string;
  displayName: string;

  running:
    boolean;

  rule:
    DeviceApplicationPolicyRule |
    undefined;
};

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

function processKey(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /\.exe$/i,
      "",
    )
    .toLowerCase();
}

function isProtectedProcess(
  value: string,
): boolean {
  return protectedProcessKeys.has(
    processKey(
      value,
    ),
  );
}

export function DeviceApplicationPolicyPanel({
  deviceId,
  token,
}: DeviceApplicationPolicyPanelProps) {
  const [
    runningApplications,
    setRunningApplications,
  ] =
    useState<RunningApplication[]>(
      [],
    );

  const [
    rules,
    setRules,
  ] =
    useState<
      DeviceApplicationPolicyRule[]
    >(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    changingProcess,
    setChangingProcess,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const [
            applications,
            policy,
          ] =
            await Promise.all([
              fetchDeviceApplications(
                deviceId,
                token,
              ),

              fetchDeviceApplicationPolicy(
                deviceId,
                token,
              ),
            ]);

          setRunningApplications(
            applications
              .runningApplications,
          );

          setRules(
            policy.rules,
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load application policy.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        deviceId,
        token,
      ],
    );

  useEffect(
    () => {
      void load();

      const timer =
        window.setInterval(
          () => {
            void load();
          },
          30_000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      load,
    ],
  );

  const rows =
    useMemo(
      () => {
        const result =
          new Map<
            string,
            PolicyRow
          >();

        const ruleMap =
          new Map<
            string,
            DeviceApplicationPolicyRule
          >();

        for (
          const rule of rules
        ) {
          ruleMap.set(
            processKey(
              rule.processName,
            ),
            rule,
          );
        }

        for (
          const app of
            runningApplications
        ) {
          const key =
            processKey(
              app.processName,
            );

          if (
            result.has(
              key,
            )
          ) {
            continue;
          }

          const rule =
            ruleMap.get(
              key,
            );

          result.set(
            key,
            {
              processKey:
                key,

              processName:
                app.processName,

              displayName:
                rule?.displayName ??
                app.processName,

              running:
                true,

              rule,
            },
          );
        }

        for (
          const rule of rules
        ) {
          const key =
            processKey(
              rule.processName,
            );

          if (
            result.has(
              key,
            )
          ) {
            continue;
          }

          result.set(
            key,
            {
              processKey:
                key,

              processName:
                rule.processName,

              displayName:
                rule.displayName ??
                rule.processName,

              running:
                false,

              rule,
            },
          );
        }

        return [
          ...result.values(),
        ].sort(
          (a, b) =>
            a.displayName
              .localeCompare(
                b.displayName,
              ),
        );
      },
      [
        runningApplications,
        rules,
      ],
    );

  const enforcementStatus =
    rules.length === 0
      ? "No policy assigned"
      : rules.some(
            (rule) =>
              rule.enabled &&
              rule.enforcementStatus === "failed",
          )
        ? "Failed"
        : rules.some(
            (rule) =>
              rule.enabled &&
              rule.enforcementStatus !== "applied",
            )
          ? "Pending"
          : "Applied";

  async function changePolicy(
    row: PolicyRow,
    action:
      | "block"
      | "allow",
  ): Promise<void> {
    if (
      action === "block" &&
      isProtectedProcess(
        row.processName,
      )
    ) {
      setError(
        "This Windows or AI BOS process is protected from restriction.",
      );

      return;
    }

    if (
      action === "block"
    ) {
      const confirmed =
        window.confirm(
          "Block " +
            row.displayName +
            " on this device?",
        );

      if (!confirmed) {
        return;
      }
    }

    setChangingProcess(
      row.processKey,
    );

    setError(
      null,
    );

    setMessage(
      null,
    );

    try {
      await setDeviceApplicationPolicy(
        deviceId,
        row.processName,
        row.displayName,
        action,
        token,
      );

      setMessage(
        action === "block"
          ? row.displayName +
              " restriction enabled."
          : row.displayName +
              " restriction removed.",
      );

      await load();
    } catch (
      changeError
    ) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Failed to update application policy.",
      );
    } finally {
      setChangingProcess(
        null,
      );
    }
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>
          Application Restrictions
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Block or allow applications by process name on this device.
          Policies are enforced in the logged-in user session.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {rules.filter(
              (rule) =>
                rule.enabled &&
                rule.action ===
                  "block",
            ).length}{" "}
            blocked application(s)
          </div>

          <div className="text-sm font-medium">
            Enforcement: {enforcementStatus}
          </div>

          <Button
            disabled={
              loading
            }
            onClick={() =>
              void load()
            }
            size="sm"
            type="button"
            variant="outline"
          >
            {loading
              ? "Refreshing..."
              : "Refresh Policy"}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border p-3 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border p-3 text-sm">
            {message}
          </div>
        )}

        {rows.length ===
        0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {rules.length === 0
              ? "No policy assigned. Running applications will appear when the endpoint reports them."
              : "No running applications are currently reported."}
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="p-3 font-medium">
                    Application
                  </th>

                  <th className="p-3 font-medium">
                    Running
                  </th>

                  <th className="p-3 font-medium">
                    Policy
                  </th>

                  <th className="p-3 font-medium">
                    Enforcement
                  </th>

                  <th className="p-3 font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => {
                    const blocked =
                      row.rule
                        ?.enabled ===
                        true &&
                      row.rule
                        ?.action ===
                        "block";

                    const protectedProcess =
                      isProtectedProcess(
                        row.processName,
                      );

                    return (
                      <tr
                        className="border-b last:border-b-0"
                        key={
                          row.processKey
                        }
                      >
                        <td className="p-3">
                          <div className="font-medium">
                            {
                              row.displayName
                            }
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {
                              row.processName
                            }
                          </div>
                        </td>

                        <td className="p-3">
                          {row.running
                            ? "Yes"
                            : "No"}
                        </td>

                        <td className="p-3">
                          {protectedProcess
                            ? "Protected"
                            : blocked
                              ? "Blocked"
                              : "Allowed"}
                        </td>

                        <td className="p-3 text-xs">
                          {row.rule
                            ? row.rule.enforcementStatus === "failed"
                              ? row.rule.enforcementError ?? "Failed"
                              : row.rule.enforcementStatus !== "applied"
                                ? "Pending"
                                : "Applied"
                            : "No policy"}
                        </td>

                        <td className="p-3">
                          {protectedProcess ? (
                            <span className="text-xs text-muted-foreground">
                              System protected
                            </span>
                          ) : (
                            <Button
                              disabled={
                                changingProcess ===
                                row.processKey
                              }
                              onClick={() =>
                                void changePolicy(
                                  row,
                                  blocked
                                    ? "allow"
                                    : "block",
                                )
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {changingProcess ===
                              row.processKey
                                ? "Saving..."
                                : blocked
                                  ? "Allow"
                                  : "Block"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Restrictions use approved process-name policy only.
          No executable path, PID, or shell command is supplied by the administrator.
        </div>
      </CardContent>
    </Card>
  );
}
