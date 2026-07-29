import type { Request, RequestHandler, Response } from "express";
import type {
  MonitoringAlert,
  MonitoringMetric,
  MonitoringOverview,
  MonitoringReport,
  MonitoringTimeSeriesPoint,
} from "../constants/monitoring.js";
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

function randomInRange(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function buildTimeSeries(points = 24, base = 60, variance = 18): MonitoringTimeSeriesPoint[] {
  const now = new Date();
  return Array.from({ length: points }).map((_, index) => {
    const timestamp = new Date(now.getTime() - (points - 1 - index) * 60 * 60 * 1000).toISOString();
    const value = Math.round((base + randomInRange(-variance, variance)) * 100) / 100;
    return { timestamp, value };
  });
}

function resolveStatus(value: number, warningThreshold: number, criticalThreshold: number) {
  if (value >= criticalThreshold) return "critical";
  if (value >= warningThreshold) return "warning";
  return "healthy";
}

export class MonitoringController {
  overview: RequestHandler = async (_req: Request, res: Response) => {
    const overview: MonitoringOverview = {
      updatedAt: new Date().toISOString(),
      healthScore: 82,
      application: {
        status: "healthy",
        uptimeSeconds: 345_231,
        errorRate: 0.21,
        responseTimeMs: 148,
        requestsPerMinute: 127,
      },
      server: {
        status: "healthy",
        cpuUsagePercent: 34,
        memoryUsagePercent: 58,
        diskUsagePercent: 46,
        activeConnections: 88,
      },
      database: {
        status: "healthy",
        connectionPool: 14,
        queryLatencyMs: 6,
        replicationLagMs: 1,
        storageUsedPercent: 52,
      },
      api: {
        status: "healthy",
        p50Ms: 92,
        p95Ms: 210,
        p99Ms: 418,
        errorRate: 0.18,
      },
      ai: {
        status: "healthy",
        avgResponseTimeMs: 760,
        queueDepth: 11,
        modelLatencyMs: 520,
        lastHealthCheck: new Date().toISOString(),
      },
      backgroundJobs: {
        total: 12,
        running: 3,
        failed: 0,
        pending: 4,
        nextRunAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      queueStatus: [
        { name: "email", depth: 5, consumerCount: 2, status: "healthy" },
        { name: "notifications", depth: 22, consumerCount: 3, status: "warning" },
        { name: "ai-requests", depth: 11, consumerCount: 2, status: "healthy" },
        { name: "webhooks", depth: 0, consumerCount: 1, status: "healthy" },
      ],
      business: {
        healthScore: 81,
        dailyActiveUsers: 842,
        conversionRate: 4.2,
        revenueToday: 12840,
      },
    };

    res.status(200).json({ success: true, data: overview satisfies MonitoringOverview as MonitoringOverview });
  };

  metrics: RequestHandler = async (req: Request, res: Response) => {
    const category = (req.query.category as string | undefined) ?? "application";

    const series = buildTimeSeries(24, category === "api" ? 90 : category === "ai" ? 700 : 55, category === "server" ? 24 : 16);

    const metrics: MonitoringMetric[] = [
      { label: "Avg Response Time", value: category === "ai" ? 760 : category === "api" ? 148 : 92, unit: "ms", trend: -2.4, status: "healthy" },
      { label: "Error Rate", value: category === "api" ? 0.18 : 0.21, unit: "%", trend: 1.1, status: "healthy" },
      { label: "Throughput", value: category === "api" ? 410 : 127, unit: "req/min", trend: 4.6, status: "healthy" },
      { label: "Availability", value: 99.94, unit: "%", trend: 0.01, status: "healthy" },
    ];

    res.status(200).json({ success: true, data: { category, series, metrics } });
  };

  alerts: RequestHandler = async (_req: Request, res: Response) => {
    const alerts: MonitoringAlert[] = [
      {
        _id: "alert-1",
        severity: "warning",
        category: "api",
        title: "P95 latency elevated",
        description: "API P95 latency crossed 210ms for 6 minutes.",
        source: "api-gateway",
        createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      },
      {
        _id: "alert-2",
        severity: "warning",
        category: "server",
        title: "Memory usage trending up",
        description: "Server memory usage increased to 58% over the last 2 hours.",
        source: "node-exporter",
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
      {
        _id: "alert-3",
        severity: "error",
        category: "database",
        title: "Replication lag spike",
        description: "Replication lag briefly spiked to 12ms.",
        source: "mongodb-exporter",
        createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      },
      {
        _id: "alert-4",
        severity: "critical",
        category: "ai",
        title: "AI queue depth high",
        description: "AI request queue depth exceeded threshold.",
        source: "local-ai",
        createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      },
      {
        _id: "alert-5",
        severity: "info",
        category: "application",
        title: "Deployment completed",
        description: "Monitoring rollout deployed successfully.",
        source: "cicd",
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    ];

    res.status(200).json({ success: true, data: alerts });
  };

  reports: RequestHandler = async (_req: Request, res: Response) => {
    const reports: MonitoringReport[] = [
      { _id: "report-1", type: "health", title: "Daily Health Report", date: new Date().toISOString(), downloadUrl: "/api/v1/monitoring/reports/export" },
      { _id: "report-2", type: "performance", title: "Weekly Performance Report", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), downloadUrl: "/api/v1/monitoring/reports/export" },
      { _id: "report-3", type: "ai", title: "AI Operations Report", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), downloadUrl: "/api/v1/monitoring/reports/export" },
    ];

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
    res.status(200).json({ success: true, message: "Alert acknowledged", data: { alertId: req.params.id } });
  };
}

export const monitoringController = new MonitoringController();
