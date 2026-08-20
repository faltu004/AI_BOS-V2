import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Package,
  PlayCircle,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  formatDateTime,
} from "@shared/lib/utils-helpers";

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
  type DeviceApplicationSnapshot,
  type RunningApplication,
} from "./monitoring.api";

import {
  DeviceApplicationUsageHistory,
} from "./DeviceApplicationUsageHistory";

type DeviceApplicationsPanelProps = {
  deviceId: string;
  token: string | undefined;
};

function formatMemory(
  value: number | null | undefined,
): string {
  if (
    typeof value !== "number" ||
    value < 0
  ) {
    return "—";
  }

  const mb =
    value / 1024 / 1024;

  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }

  return `${Math.round(mb)} MB`;
}

function formatCpu(
  value: number | null | undefined,
): string {
  if (
    typeof value !== "number" ||
    value < 0
  ) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

function friendlyProcessName(
  processName: string,
): string {
  const names:
    Record<string, string> = {
      chrome:
        "Google Chrome",

      Code:
        "Visual Studio Code",

      explorer:
        "File Explorer",

      SystemSettings:
        "Windows Settings",

      msedge:
        "Microsoft Edge",

      firefox:
        "Mozilla Firefox",

      brave:
        "Brave",

      WINWORD:
        "Microsoft Word",

      EXCEL:
        "Microsoft Excel",

      POWERPNT:
        "Microsoft PowerPoint",

      OUTLOOK:
        "Microsoft Outlook",

      Teams:
        "Microsoft Teams",
    };

  return (
    names[processName] ??
    processName
  );
}

function isUiHelperProcess(
  app: RunningApplication,
): boolean {
  const hiddenProcesses =
    new Set([
      "ApplicationFrameHost",
      "TextInputHost",
    ]);

  return hiddenProcesses.has(
    app.processName,
  );
}

export function DeviceApplicationsPanel({
  deviceId,
  token,
}: DeviceApplicationsPanelProps) {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<DeviceApplicationSnapshot | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const loadApplications =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await fetchDeviceApplications(
              deviceId,
              token,
            );

          setSnapshot(
            result,
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load applications.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        deviceId,
        token,
      ],
    );

  useEffect(
    () => {
      void loadApplications();

      const timer =
        window.setInterval(
          () => {
            void loadApplications();
          },
          60_000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      loadApplications,
    ],
  );

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const runningApplications =
    useMemo(
      () => {
        const applications =
          snapshot
            ?.runningApplications
            .filter(
              (app) =>
                !isUiHelperProcess(
                  app,
                ),
            ) ??
          [];

        if (
          !normalizedSearch
        ) {
          return applications;
        }

        return applications.filter(
          (app) =>
            friendlyProcessName(
              app.processName,
            )
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            app.processName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ),
        );
      },
      [
        snapshot,
        normalizedSearch,
      ],
    );

  const reportedRunningApplications =
    useMemo(
      () =>
        snapshot
          ?.runningApplications
          .filter(
            (app) =>
              !isUiHelperProcess(
                app,
              ),
          ) ?? [],
      [
        snapshot,
      ],
    );

  const hasApplicationReport =
    Boolean(
      snapshot?.collectedAt,
    );

  const installedApplications =
    useMemo(
      () => {
        const applications =
          snapshot
            ?.installedApplications ??
          [];

        if (
          !normalizedSearch
        ) {
          return applications;
        }

        return applications.filter(
          (app) =>
            app.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            Boolean(
              app.publisher
                ?.toLowerCase()
                .includes(
                  normalizedSearch,
                ),
            ) ||
            Boolean(
              app.version
                ?.toLowerCase()
                .includes(
                  normalizedSearch,
                ),
            ),
        );
      },
      [
        snapshot,
        normalizedSearch,
      ],
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Applications
          </h2>

          <p className="text-sm text-muted-foreground">
            Installed software and currently running applications
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              className="h-9 w-64 rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search applications..."
              type="search"
              value={search}
            />
          </div>

          <Button
            disabled={
              loading
            }
            onClick={() =>
              void loadApplications()
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Currently Running
              </span>

              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {
                  runningApplications.length
                }
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading &&
            !snapshot ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading running applications...
              </div>
            ) : !hasApplicationReport ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Not reported yet.
              </div>
            ) : reportedRunningApplications.length ===
              0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                0 running apps.
              </div>
            ) : runningApplications.length ===
              0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No matching running applications.
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
                        CPU
                      </th>

                      <th className="p-3 font-medium">
                        Memory
                      </th>

                      <th className="p-3 font-medium">
                        PID
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {runningApplications.map(
                      (
                        app,
                      ) => (
                        <tr
                          className="border-b last:border-b-0"
                          key={`${app.processName}-${app.pid}`}
                        >
                          <td className="p-3">
                            <div className="font-medium">
                              {friendlyProcessName(
                                app.processName,
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {
                                app.processName
                              }
                            </div>
                          </td>

                          <td className="p-3">
                            {formatCpu(
                              app.cpuUsage,
                            )}
                          </td>

                          <td className="p-3">
                            {formatMemory(
                              app.memoryBytes,
                            )}
                          </td>

                          <td className="p-3 font-mono text-xs">
                            {app.pid}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Installed Applications
              </span>

              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {
                  installedApplications.length
                }
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading &&
            !snapshot ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading installed applications...
              </div>
            ) : !hasApplicationReport ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Installed applications have not been reported yet.
              </div>
            ) : installedApplications.length ===
              0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No installed applications were reported by the endpoint.
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
                        Version
                      </th>

                      <th className="p-3 font-medium">
                        Publisher
                      </th>

                      <th className="p-3 font-medium">
                        Scope
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {installedApplications.map(
                      (
                        app,
                        index,
                      ) => (
                        <tr
                          className="border-b last:border-b-0"
                          key={`${app.name}-${app.version ?? "none"}-${index}`}
                        >
                          <td className="p-3 font-medium">
                            {
                              app.name
                            }
                          </td>

                          <td className="p-3">
                            {
                              app.version ??
                              "—"
                            }
                          </td>

                          <td className="p-3">
                            {
                              app.publisher ??
                              "—"
                            }
                          </td>

                          <td className="p-3">
                            <div className="capitalize">
                              {
                                app.scope
                              }
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {
                                app.architecture
                              }
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {app.source === "registry"
                                ? "Windows Registry"
                                : "Source unavailable"}
                              {app.installDate
                                ? ` · Installed ${app.installDate}`
                                : ""}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeviceApplicationUsageHistory
        deviceId={deviceId}
        token={token}
      />

      <div className="text-xs text-muted-foreground">
        Last application scan:{" "}
        {snapshot?.collectedAt
          ? formatDateTime(
              snapshot.collectedAt,
            )
          : "No snapshot yet"}
        {snapshot?.reporterSource
          ? ` · Source: ${snapshot.reporterSource}`
          : ""}
        {snapshot?.sessionContext
          ? ` · ${snapshot.sessionContext}`
          : ""}
        {" · "}
        Auto refresh every 60 seconds
      </div>
    </div>
  );
}

