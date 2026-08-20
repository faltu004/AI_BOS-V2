import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Cpu,
  HardDrive,
  Monitor,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatDateTime } from "@shared/lib/utils-helpers";
import { Button } from "@shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/ui/card";
import { StatCard } from "@shared/ui/stat-card";
import {
  fetchManagedDevices,
  type ManagedDevice,
} from "./monitoring.api";

type ManagedDevicesPanelProps = {
  token: string | undefined;
};

function formatPercent(
  value: number | undefined,
): string {
  if (typeof value !== "number") {
    return "â€”";
  }

  return `${value.toFixed(1)}%`;
}

function usageClass(
  value: number | undefined,
): string {
  if (typeof value !== "number") {
    return "text-muted-foreground";
  }

  if (value >= 90) {
    return "font-semibold text-rose-600 dark:text-rose-400";
  }

  if (value >= 80) {
    return "font-semibold text-amber-600 dark:text-amber-400";
  }

  return "font-semibold text-emerald-600 dark:text-emerald-400";
}

function statusBadge(device: ManagedDevice) {
  if (device.status === "online") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <Wifi className="h-3.5 w-3.5" />
        Online
      </span>
    );
  }

  if (device.status === "disabled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/40 bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
        <WifiOff className="h-3.5 w-3.5" />
        Disabled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
      <WifiOff className="h-3.5 w-3.5" />
      Offline
    </span>
  );
}

export function ManagedDevicesPanel({
  token,
}: ManagedDevicesPanelProps) {
  const [devices, setDevices] = useState<
    ManagedDevice[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<
    string | null
  >(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await fetchManagedDevices(token);

      setDevices(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load managed devices.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDevices();

    const timer = window.setInterval(() => {
      void loadDevices();
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadDevices]);

  const summary = useMemo(() => {
    const online = devices.filter(
      (device) => device.status === "online",
    ).length;

    const offline = devices.filter(
      (device) => device.status === "offline",
    ).length;

    const diskWarnings = devices.filter(
      (device) =>
        typeof device.diskUsage === "number" &&
        device.diskUsage >= 85,
    ).length;

    return {
      total: devices.length,
      online,
      offline,
      diskWarnings,
    };
  }, [devices]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">
            Endpoint Monitoring
          </p>

          <h2 className="text-xl font-bold">
            Managed Devices
          </h2>

          <p className="text-sm text-muted-foreground">
            Live CPU, memory, disk and connectivity
            information from installed agents.
          </p>
        </div>

        <Button
          disabled={loading}
          onClick={() => void loadDevices()}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          {loading ? "Refreshing..." : "Refresh Devices"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Monitor}
          label="Total Devices"
          value={summary.total}
        />

        <StatCard
          icon={Wifi}
          label="Online"
          value={summary.online}
        />

        <StatCard
          icon={WifiOff}
          label="Offline"
          value={summary.offline}
        />

        <StatCard
          icon={AlertTriangle}
          label="Disk Warnings"
          value={summary.diskWarnings}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Device Status
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading && devices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading managed devices...
            </p>
          ) : devices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No managed devices registered yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">
                      Device
                    </th>
                    <th className="px-3 py-3">
                      Status
                    </th>
                    <th className="px-3 py-3">
                      CPU
                    </th>
                    <th className="px-3 py-3">
                      RAM
                    </th>
                    <th className="px-3 py-3">
                      Disk
                    </th>
                    <th className="px-3 py-3">
                      Network
                    </th>
                    <th className="px-3 py-3">
                      User
                    </th>
                    <th className="px-3 py-3">
                      Last Seen
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {devices.map((device) => (
                    <tr
                      className="border-b last:border-0"
                      key={
                        device._id ??
                        device.deviceId
                      }
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Monitor className="h-4 w-4 text-primary" />
                          </div>

                          <div>
                            <p className="font-semibold">
  <Link
    className="hover:underline"
    to={`/monitoring/devices/${encodeURIComponent(device.deviceId)}`}
  >
    {device.hostname}
  </Link>
</p>

                            <p className="text-xs text-muted-foreground">
                              {device.deviceId}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {[
                                device.os,
                                device.osVersion,
                                device.architecture,
                              ]
                                .filter(Boolean)
                                .join(" Â· ") || "Unknown OS"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        {statusBadge(device)}
                      </td>

                      <td
                        className={`px-3 py-4 ${usageClass(
                          device.cpuUsage,
                        )}`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Cpu className="h-4 w-4" />
                          {formatPercent(
                            device.cpuUsage,
                          )}
                        </span>
                      </td>

                      <td
                        className={`px-3 py-4 ${usageClass(
                          device.ramUsage,
                        )}`}
                      >
                        {formatPercent(
                          device.ramUsage,
                        )}
                      </td>

                      <td
                        className={`px-3 py-4 ${usageClass(
                          device.diskUsage,
                        )}`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <HardDrive className="h-4 w-4" />
                          {formatPercent(
                            device.diskUsage,
                          )}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        {device.networkOnline ===
                        false ? (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                            <WifiOff className="h-4 w-4" />
                            Disconnected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <Wifi className="h-4 w-4" />
                            Connected
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        {device.username || "â€”"}
                      </td>

                      <td className="px-3 py-4 text-muted-foreground">
                        {device.lastSeenAt
                          ? formatDateTime(
                              device.lastSeenAt,
                            )
                          : "â€”"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
