import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  RefreshCw,
} from "lucide-react";

import { Button } from "@shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/ui/card";

import {
  fetchDeviceMetrics,
  type DeviceMetricRange,
  type DeviceMetricsResponse,
} from "./monitoring.api";

type DevicePerformanceHistoryProps = {
  deviceId: string;
  token: string | undefined;
};

const ranges: {
  value: DeviceMetricRange;
  label: string;
}[] = [
  {
    value: "1h",
    label: "1 Hour",
  },
  {
    value: "24h",
    label: "24 Hours",
  },
  {
    value: "7d",
    label: "7 Days",
  },
];

function formatChartTime(
  value: string,
  range: DeviceMetricRange,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (range === "7d") {
    return new Intl.DateTimeFormat(
      undefined,
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      },
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export function DevicePerformanceHistory({
  deviceId,
  token,
}: DevicePerformanceHistoryProps) {
  const [range, setRange] =
    useState<DeviceMetricRange>("1h");

  const [metrics, setMetrics] =
    useState<DeviceMetricsResponse | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadMetrics = useCallback(
    async (showLoading = false) => {
      if (!deviceId) {
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const result =
          await fetchDeviceMetrics(
            deviceId,
            range,
            token,
          );

        setMetrics(result);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load performance history.",
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [
      deviceId,
      range,
      token,
    ],
  );

  useEffect(() => {
    void loadMetrics(true);

    const timer =
      window.setInterval(
        () => {
          void loadMetrics(false);
        },
        30_000,
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [loadMetrics]);

  const chartData = useMemo(
    () =>
      (metrics?.points ?? []).map(
        (point) => ({
          recordedAt:
            point.recordedAt,

          time: formatChartTime(
            point.recordedAt,
            range,
          ),

          cpu:
            typeof point.cpuUsage ===
            "number"
              ? Number(
                  point.cpuUsage.toFixed(1),
                )
              : null,

          ram:
            typeof point.ramUsage ===
            "number"
              ? Number(
                  point.ramUsage.toFixed(1),
                )
              : null,

          disk:
            typeof point.diskUsage ===
            "number"
              ? Number(
                  point.diskUsage.toFixed(1),
                )
              : null,
        })),
    [
      metrics,
      range,
    ],
  );

  return (
    <Card className="glass">
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance History
          </CardTitle>

          <p className="mt-1 text-sm text-muted-foreground">
            CPU, RAM and disk usage collected
            from device heartbeats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ranges.map((item) => (
            <Button
              key={item.value}
              onClick={() =>
                setRange(item.value)
              }
              size="sm"
              type="button"
              variant={
                range === item.value
                  ? "default"
                  : "outline"
              }
            >
              {item.label}
            </Button>
          ))}

          <Button
            disabled={loading}
            onClick={() =>
              void loadMetrics(true)
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
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {loading &&
        chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            Loading performance history...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center gap-2 text-center">
            <Activity className="h-8 w-8 text-muted-foreground" />

            <p className="font-medium">
              No historical metrics yet
            </p>

            <p className="max-w-md text-sm text-muted-foreground">
              Keep the device agent running.
              New heartbeat samples will
              appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {chartData.length} data points
              </span>

              <span>
                Auto refresh: 30 seconds
              </span>
            </div>

            <div className="h-80 w-full overflow-x-auto">
              <div className="h-full min-w-[700px]">
                <ResponsiveContainer
                  height="100%"
                  width="100%"
                >
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      minTickGap={30}
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tick={{
                        fontSize: 12,
                      }}
                      width={40}
                    />

                    <Tooltip />

                    <Legend />

                    <Line
                      connectNulls
                      dataKey="cpu"
                      dot={false}
                      isAnimationActive={false}
                      name="CPU %"
                      stroke="rgb(14 165 233)"
                      strokeWidth={2}
                      type="monotone"
                    />

                    <Line
                      connectNulls
                      dataKey="ram"
                      dot={false}
                      isAnimationActive={false}
                      name="RAM %"
                      stroke="rgb(139 92 246)"
                      strokeWidth={2}
                      type="monotone"
                    />

                    <Line
                      connectNulls
                      dataKey="disk"
                      dot={false}
                      isAnimationActive={false}
                      name="Disk %"
                      stroke="rgb(245 158 11)"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

