import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Battery,
  Clock3,
  Cpu,
  HardDrive,
  Monitor,
  RefreshCw,
  Server,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";

import { getStoredAuthSession } from "@shared/auth/auth-service";
import { formatDateTime } from "@shared/lib/utils-helpers";
import { Button } from "@shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/ui/card";
import { StatCard } from "@shared/ui/stat-card";
import { DevicePerformanceHistory } from "./DevicePerformanceHistory";
import { DeviceApplicationsPanel } from "./DeviceApplicationsPanel";
import { DeviceApplicationPolicyPanel } from "./DeviceApplicationPolicyPanel";
import { DeviceRemoteSupportPanel } from "./DeviceRemoteSupportPanel";
import { DeviceCommandsPanel } from "./DeviceCommandsPanel";
import { DeviceSoftwareManagementPanel } from "./DeviceSoftwareManagementPanel";
import { DeviceCredentialPanel } from "./DeviceCredentialPanel";
import { useAdministratorMonitoringAccess } from "@/admin/features/administrator-access/AdministratorMonitoringAccessContext";

import {
  fetchManagedDevice,
  type ManagedDevice,
} from "./monitoring.api";

function formatPercent(
  value: number | undefined,
): string {
  if (typeof value !== "number") {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatBytes(
  value: number | undefined,
): string {
  if (
    typeof value !== "number" ||
    value <= 0
  ) {
    return "—";
  }

  const gb = value / 1024 / 1024 / 1024;

  return `${gb.toFixed(1)} GB`;
}

function formatUptime(
  seconds: number | undefined,
): string {
  if (
    typeof seconds !== "number" ||
    seconds < 0
  ) {
    return "—";
  }

  const days = Math.floor(
    seconds / 86_400,
  );

  const hours = Math.floor(
    (seconds % 86_400) / 3_600,
  );

  const minutes = Math.floor(
    (seconds % 3_600) / 60,
  );

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatMilliseconds(
  value: number | undefined,
): string {
  if (
    typeof value !== "number" ||
    value < 0
  ) {
    return "No data";
  }

  return `${Math.round(value)} ms`;
}

function formatTelemetryAge(
  value: string | undefined,
): string {
  if (!value) {
    return "No data";
  }

  const timestamp =
    new Date(value).getTime();

  if (
    Number.isNaN(timestamp)
  ) {
    return "No data";
  }

  const seconds =
    Math.max(
      0,
      Math.round(
        (Date.now() - timestamp) /
          1000,
      ),
    );

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes =
    Math.floor(seconds / 60);

  return `${minutes}m ago`;
}

function sessionTelemetryLabel(
  device: ManagedDevice,
): string {
  if (device.status === "offline") {
    return "Offline";
  }

  if (!device.sessionTelemetryAt) {
    return "No telemetry yet";
  }

  if (device.sessionTelemetryStale) {
    return "Stale";
  }

  return device.sessionState ===
    "active"
    ? "Active"
    : "Unavailable";
}

function prettyJson(value: unknown): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "No data available.";
  }

  return (
    JSON.stringify(value, null, 2) ??
    "No data available."
  );
}

function PermissionUnavailable({
  title,
}: {
  title: string;
}) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        The Owner has not enabled this permission for the signed-in Administrator.
      </CardContent>
    </Card>
  );
}

export function DeviceDetailsPage() {
  const {
    hasPermission,
  } =
    useAdministratorMonitoringAccess();
  const navigate = useNavigate();
  const { deviceId } = useParams<{
    deviceId: string;
  }>();

  const session = getStoredAuthSession();
  const token = session?.accessToken;
  const canManageDeviceCredentials =
    session?.user.role === "Owner" ||
    session?.user.role === "Administrator";

  const [device, setDevice] =
    useState<ManagedDevice | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadDevice = useCallback(
    async () => {
      if (!deviceId) {
        setError("Device ID is missing.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result =
          await fetchManagedDevice(
            deviceId,
            token,
          );

        setDevice(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load device.",
        );
      } finally {
        setLoading(false);
      }
    },
    [deviceId, token],
  );

  useEffect(() => {
    void loadDevice();

    const timer = window.setInterval(
      () => {
        void loadDevice();
      },
      30_000,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [loadDevice]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            onClick={() =>
              navigate("/monitoring")
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div>
            <p className="text-sm font-semibold text-primary">
              Managed Endpoint
            </p>

            <h1 className="text-2xl font-bold">
              {device?.hostname ??
                "Device Details"}
            </h1>

            <p className="text-sm text-muted-foreground">
              {device?.deviceId ??
                deviceId ??
                ""}
            </p>
          </div>
        </div>

        <Button
          disabled={loading}
          onClick={() =>
            void loadDevice()
          }
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading && !device && (
        <Card className="glass">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading device information...
          </CardContent>
        </Card>
      )}

      {device && (
        <>
          {typeof device.diskUsage ===
            "number" &&
            device.diskUsage >= 85 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
                Disk usage is high at{" "}
                {formatPercent(
                  device.diskUsage,
                )}.
              </div>
            )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={
                device.status === "online"
                  ? Wifi
                  : WifiOff
              }
              label="Status"
              value={device.status}
            />

            <StatCard
              icon={Cpu}
              label="CPU Usage"
              value={formatPercent(
                device.cpuUsage,
              )}
            />

            <StatCard
              icon={Activity}
              label="RAM Usage"
              value={formatPercent(
                device.ramUsage,
              )}
            />

            <StatCard
              icon={HardDrive}
              label="Disk Usage"
              value={formatPercent(
                device.diskUsage,
              )}
            />
          </div>

          <DevicePerformanceHistory
            deviceId={device.deviceId}
            token={token}
          />

          <DeviceApplicationsPanel
            deviceId={device.deviceId}
            token={token}
          />

          {hasPermission(
            "device.restriction.manage",
          ) ? (
            <DeviceApplicationPolicyPanel
              deviceId={device.deviceId}
              token={token}
            />
          ) : (
            <PermissionUnavailable title="Application Restrictions" />
          )}

          {hasPermission(
            "device.remote_support.create",
          ) ? (
            <DeviceRemoteSupportPanel
              deviceId={device.deviceId}
              token={token}
              employeeSessionAvailable={
                device.status === "online" &&
                device.sessionState === "active"
              }
            />
          ) : (
            <PermissionUnavailable title="Remote Support" />
          )}

          {hasPermission(
            "device.software.manage",
          ) ? (
            <DeviceSoftwareManagementPanel
              deviceId={device.deviceId}
              token={token}
            />
          ) : (
            <PermissionUnavailable title="Software Management" />
          )}

          {hasPermission(
            "device.command.view",
          ) ? (
            <DeviceCommandsPanel
              deviceId={device.deviceId}
              token={token}
            />
          ) : (
            <PermissionUnavailable title="Device Commands" />
          )}

          {canManageDeviceCredentials ? (
            <DeviceCredentialPanel
              deviceId={device.deviceId}
              token={token}
            />
          ) : (
            <PermissionUnavailable title="Device Credential Security" />
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Device Information
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Hostname
                  </span>
                  <span className="font-medium">
                    {device.hostname}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Device ID
                  </span>
                  <span className="font-medium">
                    {device.deviceId}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Operating System
                  </span>
                  <span className="text-right font-medium">
                    {[
                      device.os,
                      device.osVersion,
                    ]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Architecture
                  </span>
                  <span className="font-medium">
                    {device.architecture ||
                      "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Agent Version
                  </span>
                  <span className="font-medium">
                    {device.appVersion ||
                      "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Installed Memory
                  </span>
                  <span className="font-medium">
                    {formatBytes(
                      device.memoryBytes,
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Live Information
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    Logged-in User
                  </span>

                  <span className="font-medium">
                    {device.username ||
                      "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Wifi className="h-4 w-4" />
                    Network
                  </span>

                  <span className="font-medium">
                    {device.networkOnline ===
                    false
                      ? "Disconnected"
                      : "Connected"}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Last IP
                  </span>

                  <span className="font-medium">
                    {device.lastIp || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Battery className="h-4 w-4" />
                    Battery
                  </span>

                  <span className="font-medium">
                    {formatPercent(
                      device.batteryPercent,
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    Uptime
                  </span>

                  <span className="font-medium">
                    {formatUptime(
                      device.uptime,
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Last Seen
                  </span>

                  <span className="text-right font-medium">
                    {device.lastSeenAt
                      ? formatDateTime(
                          device.lastSeenAt,
                        )
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Session Telemetry
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    State
                  </span>
                  <span className="font-medium">
                    {sessionTelemetryLabel(
                      device,
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Current User
                  </span>
                  <span className="font-medium">
                    {device.currentUser ||
                      "No data"}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Current App
                  </span>
                  <span className="text-right font-medium">
                    {device.currentApplication
                      ?.processName ??
                      "No data"}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    App PID
                  </span>
                  <span className="font-mono text-xs">
                    {device.currentApplication
                      ? device.currentApplication
                          .pid
                      : "No data"}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Telemetry Age
                  </span>
                  <span className="font-medium">
                    {formatTelemetryAge(
                      device.sessionTelemetryAt,
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Last Backend Latency
                  </span>
                  <span className="font-medium">
                    {formatMilliseconds(
                      device.lastHeartbeatLatencyMs,
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle>
                  CPU / Hardware Inventory
                </CardTitle>
              </CardHeader>

              <CardContent>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted/50 p-4 text-xs">
                  {prettyJson(device.cpu)}
                </pre>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>
                  System Information
                </CardTitle>
              </CardHeader>

              <CardContent>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted/50 p-4 text-xs">
                  {prettyJson(
                    device.system,
                  )}
                </pre>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>
                  Disk Inventory
                </CardTitle>
              </CardHeader>

              <CardContent>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted/50 p-4 text-xs">
                  {prettyJson(
                    device.disks,
                  )}
                </pre>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>
                  Network Inventory
                </CardTitle>
              </CardHeader>

              <CardContent>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted/50 p-4 text-xs">
                  {prettyJson(
                    device.network,
                  )}
                </pre>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}






