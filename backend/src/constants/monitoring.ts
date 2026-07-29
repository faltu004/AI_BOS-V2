export const MONITORING_CATEGORIES = {
  application: "application",
  server: "server",
  database: "database",
  api: "api",
  ai: "ai",
  business: "business",
} as const;

export type MonitoringCategory = (typeof MONITORING_CATEGORIES)[keyof typeof MONITORING_CATEGORIES];

export const MONITORING_ALERT_SEVERITY = {
  info: "info",
  warning: "warning",
  error: "error",
  critical: "critical",
} as const;

export type MonitoringAlertSeverity = (typeof MONITORING_ALERT_SEVERITY)[keyof typeof MONITORING_ALERT_SEVERITY];

export type MonitoringMetric = {
  label: string;
  value: number | string;
  unit?: string;
  trend?: number;
  status?: "healthy" | "warning" | "critical";
};

export type MonitoringTimeSeriesPoint = {
  timestamp: string;
  value: number;
  label?: string;
};

export type MonitoringOverview = {
  updatedAt: string;
  healthScore: number;
  application: {
    status: string;
    uptimeSeconds: number;
    errorRate: number;
    responseTimeMs: number;
    requestsPerMinute: number;
  };
  server: {
    status: string;
    cpuUsagePercent: number;
    memoryUsagePercent: number;
    diskUsagePercent: number;
    activeConnections: number;
  };
  database: {
    status: string;
    connectionPool: number;
    queryLatencyMs: number;
    replicationLagMs: number;
    storageUsedPercent: number;
  };
  api: {
    status: string;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    errorRate: number;
  };
  ai: {
    status: string;
    avgResponseTimeMs: number;
    queueDepth: number;
    modelLatencyMs: number;
    lastHealthCheck: string;
  };
  backgroundJobs: {
    total: number;
    running: number;
    failed: number;
    pending: number;
    nextRunAt: string;
  };
  queueStatus: {
    name: string;
    depth: number;
    consumerCount: number;
    status: string;
  }[];
  business: {
    healthScore: number;
    dailyActiveUsers: number;
    conversionRate: number;
    revenueToday: number;
  };
};

export type MonitoringAlert = {
  _id: string;
  severity: MonitoringAlertSeverity;
  category: MonitoringCategory;
  title: string;
  description: string;
  source: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
};

export type MonitoringReport = {
  _id: string;
  type: "health" | "performance" | "incident" | "ai";
  title: string;
  date: string;
  downloadUrl: string;
};
