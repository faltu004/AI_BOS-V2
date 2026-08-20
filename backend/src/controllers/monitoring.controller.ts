import type { Request, RequestHandler, Response } from "express";
import type {
  MonitoringAlert,
  MonitoringIncidentReport,
  MonitoringMetric,
  MonitoringOverview,
  MonitoringReport,
  MonitoringTimeSeriesPoint,
} from "../constants/monitoring.js";
import { DeviceAlertStateModel } from "../models/device-alert-state.model.js";
import { DeviceApplicationSnapshotModel } from "../models/device-application-snapshot.model.js";
import { DeviceMetricModel } from "../models/device-metric.model.js";
import { ManagedDeviceModel } from "../models/managed-device.model.js";
import { UserModel } from "../models/user.model.js";
import { deviceAlertStateRepository } from "../repositories/device-alert-state.repository.js";
import { AppError } from "../utils/app-error.js";

type MonitoringErrorMap = {
  application: {
    errorRate: number;
    responseTimeMs: number;
    requestsPerMinute: number;
    status: string;
  };
  server: {
    cpuUsagePercent: number;
    memoryUsagePercent: number;
    diskUsagePercent: number;
    activeConnections: number;
    status: string;
  };
  database: {
    connectionPool: number;
    queryLatencyMs: number;
    replicationLagMs: number;
    storageUsedPercent: number;
    status: string;
  };
  api: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    errorRate: number;
    status: string;
  };
  ai: {
    avgResponseTimeMs: number;
    queueDepth: number;
    modelLatencyMs: number;
    lastHealthCheck: string;
    status: string;
  };
};

type NumericKey =
  | "cpuUsage"
  | "ramUsage"
  | "diskUsage"
  | "uptime"
  | "batteryPercent";

function average(values: Array<number | undefined>): number {
  const valid = values.filter((value): value is number => Number.isFinite(value));

  if (valid.length === 0) {
    return 0;
  }

  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 100) / 100;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildMetricSeries(metrics: Array<Record<string, unknown>>, key: NumericKey): MonitoringTimeSeriesPoint[] {
  return metrics
    .map((metric) => {
      const value = metric[key];
      const recordedAt = metric.recordedAt;

      if (typeof value !== "number" || !(recordedAt instanceof Date)) {
        return null;
      }

      return {
        timestamp: recordedAt.toISOString(),
        value: Math.round(value * 100) / 100,
      };
    })
    .filter((point): point is MonitoringTimeSeriesPoint => point !== null);
}

function resolveStatus(value: number, warningThreshold: number, criticalThreshold: number) {
  if (value >= criticalThreshold) return "critical";
  if (value >= warningThreshold) return "warning";
  return "healthy";
}

export class MonitoringController {
  overview: RequestHandler = async (_req: Request, res: Response) => {
    const [devices, snapshots] = await Promise.all([
      ManagedDeviceModel.find().lean(),
      DeviceApplicationSnapshotModel.find().lean(),
    ]);

    const onlineDevices = devices.filter((device) => device.status === "online");
    const staleSessionCount = devices.filter((device) => device.sessionTelemetryStale === true).length;
    const runningApplicationCount = snapshots.reduce((count, snapshot) => count + (snapshot.runningApplications?.length ?? 0), 0);
    const latestAppSnapshot = snapshots.reduce<Date | null>((latest, snapshot) => {
      const collectedAt = snapshot.collectedAt instanceof Date ? snapshot.collectedAt : null;

      if (!collectedAt) {
        return latest;
      }

      if (!latest || collectedAt.getTime() > latest.getTime()) {
        return collectedAt;
      }

      return latest;
    }, null);

    const server = {
      status: onlineDevices.length > 0 ? resolveStatus(
        Math.max(
          average(onlineDevices.map((device) => device.cpuUsage)),
          average(onlineDevices.map((device) => device.ramUsage)),
          average(onlineDevices.map((device) => device.diskUsage)),
        ),
        75,
        90,
      ) : "unavailable",
      cpuUsagePercent: average(onlineDevices.map((device) => device.cpuUsage)),
      memoryUsagePercent: average(onlineDevices.map((device) => device.ramUsage)),
      diskUsagePercent: average(onlineDevices.map((device) => device.diskUsage)),
      activeConnections: onlineDevices.length,
    };
    const applicationStatus = devices.length === 0 ? "unavailable" : staleSessionCount > 0 ? "warning" : "healthy";
    const application = {
      status: applicationStatus,
      uptimeSeconds: Math.round(average(onlineDevices.map((device) => device.uptime))),
      errorRate: devices.length > 0 ? Math.round((staleSessionCount / devices.length) * 10000) / 100 : 0,
      responseTimeMs: Math.round(average(onlineDevices.map((device) => device.lastHeartbeatLatencyMs))),
      requestsPerMinute: runningApplicationCount,
    };
    const infrastructureScore = onlineDevices.length === 0 ? 0 : clampScore(100 - Math.max(server.cpuUsagePercent, server.memoryUsagePercent, server.diskUsagePercent));
    const sessionScore = devices.length === 0 ? 0 : clampScore(100 - (staleSessionCount / devices.length) * 100);

    const overview: MonitoringOverview = {
      updatedAt: new Date().toISOString(),
      healthScore: clampScore((infrastructureScore + sessionScore) / 2),
      application,
      server,
      database: {
        status: "unavailable",
        connectionPool: 0,
        queryLatencyMs: 0,
        replicationLagMs: 0,
        storageUsedPercent: 0,
      },
      api: {
        status: onlineDevices.length > 0 ? "healthy" : "unavailable",
        p50Ms: application.responseTimeMs,
        p95Ms: application.responseTimeMs,
        p99Ms: application.responseTimeMs,
        errorRate: application.errorRate,
      },
      ai: {
        status: "unavailable",
        avgResponseTimeMs: 0,
        queueDepth: 0,
        modelLatencyMs: 0,
        lastHealthCheck: latestAppSnapshot?.toISOString() ?? "",
      },
      backgroundJobs: {
        total: 0,
        running: 0,
        failed: 0,
        pending: 0,
        nextRunAt: "",
      },
      queueStatus: [],
      business: {
        healthScore: sessionScore,
        dailyActiveUsers: devices.filter((device) => Boolean(device.currentUser)).length,
        conversionRate: 0,
        revenueToday: 0,
      },
    };

    res.status(200).json({ success: true, data: overview satisfies MonitoringOverview as MonitoringOverview });
  };

  metrics: RequestHandler = async (req: Request, res: Response) => {
    const category = (req.query.category as string | undefined) ?? "application";
    const recentMetrics = await DeviceMetricModel.find()
      .sort({ recordedAt: -1 })
      .limit(24)
      .lean();
    const chronological = recentMetrics.reverse() as Array<Record<string, unknown>>;
    const key: NumericKey = category === "server" ? "cpuUsage" : category === "database" ? "diskUsage" : "ramUsage";
    const series = buildMetricSeries(chronological, key);

    const metrics: MonitoringMetric[] = category === "server"
      ? [
          { label: "Avg CPU", value: average(chronological.map((metric) => metric.cpuUsage as number | undefined)), unit: "%", status: "healthy" },
          { label: "Avg Memory", value: average(chronological.map((metric) => metric.ramUsage as number | undefined)), unit: "%", status: "healthy" },
          { label: "Avg Disk", value: average(chronological.map((metric) => metric.diskUsage as number | undefined)), unit: "%", status: "healthy" },
          { label: "Samples", value: chronological.length, status: chronological.length > 0 ? "healthy" : "warning" },
        ]
      : [];

    res.status(200).json({ success: true, data: { category, series, metrics } });
  };

  alerts: RequestHandler = async (_req: Request, res: Response) => {
    const openStates = await DeviceAlertStateModel.find({ status: "open" })
      .sort({ updatedAt: -1 })
      .limit(25)
      .lean();
    const alerts: MonitoringAlert[] = openStates.map((state) => ({
      _id: String(state._id),
      severity: state.condition === "offline" ? "critical" : "warning",
      category: "server",
      title: `Device ${state.condition.replace("_", " ")}`,
      description: `Device ${state.deviceId} reported ${state.condition}.`,
      source: state.deviceId,
      createdAt: state.openedAt.toISOString(),
      acknowledgedAt: state.acknowledgedAt?.toISOString(),
      acknowledgedBy: state.acknowledgedBy,
      acknowledgedByName: state.acknowledgedByName,
      resolvedAt: state.resolvedAt?.toISOString(),
    }));

    res.status(200).json({ success: true, data: alerts });
  };

  reports: RequestHandler = async (_req: Request, res: Response) => {
    const resolvedStates = await deviceAlertStateRepository.findRecentResolved(25);

    const reports: MonitoringIncidentReport[] = resolvedStates
      .filter((state): state is typeof state & { resolvedAt: Date } => Boolean(state.resolvedAt))
      .map((state) => ({
        _id: String(state._id),
        type: "incident",
        title: `Device ${state.condition.replace("_", " ")} resolved`,
        deviceId: state.deviceId,
        condition: state.condition,
        openedAt: state.openedAt.toISOString(),
        resolvedAt: state.resolvedAt.toISOString(),
        durationSeconds: Math.max(
          0,
          Math.round((state.resolvedAt.getTime() - state.openedAt.getTime()) / 1000),
        ),
      }));

    res.status(200).json({ success: true, data: reports });
  };

  exportReport: RequestHandler = async (req: Request, res: Response) => {
    const body = req.body as { type?: string } | undefined;
    const type = body?.type ?? "health";

    res.status(200).json({
      success: true,
      message: `${type} report exported successfully`,
      data: { format: "csv", downloadUrl: `/api/v1/monitoring/reports/export?type=${type}` },
    });
  };

  acknowledgeAlert: RequestHandler = async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authenticated user is required", 401);
    }

    const alertId = req.params.id;

    const existing = await deviceAlertStateRepository.findById(alertId);

    if (!existing) {
      throw new AppError("Alert not found", 404);
    }

    const actor = await UserModel.findById(req.user.id).select("fullName").lean();

    const updated = await deviceAlertStateRepository.acknowledge(
      alertId,
      req.user.id,
      actor?.fullName ?? "Unknown user",
      new Date(),
    );

    if (!updated) {
      throw new AppError("Alert not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Alert acknowledged",
      data: {
        alertId: String(updated._id),
        acknowledgedAt: updated.acknowledgedAt?.toISOString(),
        acknowledgedBy: updated.acknowledgedBy,
        acknowledgedByName: updated.acknowledgedByName,
      },
    });
  };
}

export const monitoringController = new MonitoringController();
