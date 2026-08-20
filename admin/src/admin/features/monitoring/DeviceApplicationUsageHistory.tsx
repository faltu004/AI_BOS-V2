import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Clock3,
  History,
  RefreshCw,
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
  fetchDeviceApplicationSessions,
  type ApplicationSessionRange,
  type DeviceApplicationSession,
  type DeviceApplicationSessionsResponse,
} from "./monitoring.api";

type DeviceApplicationUsageHistoryProps = {
  deviceId: string;
  token: string | undefined;
};

const ranges:
  ApplicationSessionRange[] = [
    "1h",
    "24h",
    "7d",
    "30d",
  ];

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

function isHelperProcess(
  session:
    DeviceApplicationSession,
): boolean {
  return (
    session.processName ===
      "ApplicationFrameHost" ||
    session.processName ===
      "TextInputHost"
  );
}

function formatDuration(
  seconds: number,
): string {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "—";
  }

  if (seconds < 60) {
    return (
      seconds.toFixed(1) +
      " sec"
    );
  }

  const totalSeconds =
    Math.round(seconds);

  const hours =
    Math.floor(
      totalSeconds / 3600,
    );

  const minutes =
    Math.floor(
      (
        totalSeconds % 3600
      ) / 60,
    );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return (
      hours +
      "h " +
      minutes +
      "m " +
      remainingSeconds +
      "s"
    );
  }

  return (
    minutes +
    "m " +
    remainingSeconds +
    "s"
  );
}

export function DeviceApplicationUsageHistory({
  deviceId,
  token,
}: DeviceApplicationUsageHistoryProps) {
  const [
    range,
    setRange,
  ] =
    useState<ApplicationSessionRange>(
      "24h",
    );

  const [
    data,
    setData,
  ] =
    useState<DeviceApplicationSessionsResponse | null>(
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

  const loadHistory =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await fetchDeviceApplicationSessions(
              deviceId,
              range,
              token,
            );

          setData(
            result,
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load application usage history.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        deviceId,
        range,
        token,
      ],
    );

  useEffect(
    () => {
      void loadHistory();

      const timer =
        window.setInterval(
          () => {
            void loadHistory();
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
      loadHistory,
    ],
  );

  const sessions =
    useMemo(
      () =>
        (
          data?.sessions ??
          []
        ).filter(
          (session) =>
            !isHelperProcess(
              session,
            ),
        ),
      [
        data,
      ],
    );

  const totalActiveSeconds =
    useMemo(
      () =>
        sessions.reduce(
          (
            total,
            session,
          ) =>
            total +
            session.durationSeconds,
          0,
        ),
      [
        sessions,
      ],
    );

  const usageByApp =
    useMemo(
      () => {
        const totals =
          new Map<
            string,
            {
              processName:
                string;
              durationSeconds:
                number;
              sessions:
                number;
            }
          >();

        for (
          const session of
            sessions
        ) {
          const key =
            session.processName
              .toLowerCase();

          const existing =
            totals.get(
              key,
            );

          if (existing) {
            existing.durationSeconds +=
              session.durationSeconds;

            existing.sessions +=
              1;
          } else {
            totals.set(
              key,
              {
                processName:
                  session.processName,

                durationSeconds:
                  session.durationSeconds,

                sessions:
                  1,
              },
            );
          }
        }

        return [
          ...totals.values(),
        ].sort(
          (
            a,
            b,
          ) =>
            b.durationSeconds -
            a.durationSeconds,
        );
      },
      [
        sessions,
      ],
    );

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Application Usage History
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Foreground application activity and active time
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ranges.map(
              (
                option,
              ) => (
                <Button
                  key={
                    option
                  }
                  onClick={() =>
                    setRange(
                      option,
                    )
                  }
                  size="sm"
                  type="button"
                  variant={
                    range ===
                    option
                      ? "default"
                      : "outline"
                  }
                >
                  {option}
                </Button>
              ),
            )}

            <Button
              disabled={
                loading
              }
              onClick={() =>
                void loadHistory()
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw
                className={
                  "mr-2 h-4 w-4" +
                  (
                    loading
                      ? " animate-spin"
                      : ""
                  )
                }
              />

              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">
              Total Active Time
            </div>

            <div className="mt-1 text-lg font-semibold">
              {formatDuration(
                totalActiveSeconds,
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">
              Sessions
            </div>

            <div className="mt-1 text-lg font-semibold">
              {
                sessions.length
              }
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">
              Most Used App
            </div>

            <div className="mt-1 text-lg font-semibold">
              {usageByApp[0]
                ? friendlyProcessName(
                    usageByApp[0]
                      .processName,
                  )
                : "—"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold">
              Usage Summary
            </h3>

            {loading &&
            !data ? (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                Loading usage history...
              </div>
            ) : usageByApp.length ===
              0 ? (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                No foreground usage recorded for this range.
              </div>
            ) : (
              <div className="max-h-96 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left">
                      <th className="p-3 font-medium">
                        Application
                      </th>

                      <th className="p-3 font-medium">
                        Active Time
                      </th>

                      <th className="p-3 font-medium">
                        Sessions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {usageByApp.map(
                      (
                        app,
                      ) => (
                        <tr
                          className="border-b last:border-b-0"
                          key={
                            app.processName
                          }
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
                            {formatDuration(
                              app.durationSeconds,
                            )}
                          </td>

                          <td className="p-3">
                            {
                              app.sessions
                            }
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <Clock3 className="h-4 w-4" />
              Recent Sessions
            </h3>

            {sessions.length ===
              0 ? (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                No sessions available.
              </div>
            ) : (
              <div className="max-h-96 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left">
                      <th className="p-3 font-medium">
                        Application
                      </th>

                      <th className="p-3 font-medium">
                        Active
                      </th>

                      <th className="p-3 font-medium">
                        Started
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {[
                      ...sessions,
                    ]
                      .reverse()
                      .map(
                        (
                          session,
                        ) => (
                          <tr
                            className="border-b last:border-b-0"
                            key={
                              session._id ??
                              (
                                session.processName +
                                session.startedAt
                              )
                            }
                          >
                            <td className="p-3">
                              <div className="font-medium">
                                {friendlyProcessName(
                                  session.processName,
                                )}
                              </div>

                              <div className="text-xs text-muted-foreground">
                                PID{" "}
                                {
                                  session.pid
                                }
                              </div>
                            </td>

                            <td className="p-3">
                              {formatDuration(
                                session.durationSeconds,
                              )}
                            </td>

                            <td className="p-3 text-xs">
                              {formatDateTime(
                                session.startedAt,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Range:{" "}
          {range}
          {" · "}
          Auto refresh every 30 seconds
        </div>
      </CardContent>
    </Card>
  );
}
