import { getApiBaseUrl, getApiOrigin } from "@shared/lib/env";

const apiBaseUrl = getApiBaseUrl();

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type ManagedDevice = {
  _id: string;
  deviceId: string;
  fingerprint: string;

  hostname: string;
  username?: string;

  os?: string;
  osVersion?: string;
  architecture?: string;
  appVersion?: string;
  lastIp?: string;

  cpu?: Record<string, unknown>;
  memoryBytes?: number;
  disks?: Record<string, unknown>[];
  graphics?: Record<string, unknown>;
  system?: Record<string, unknown>;
  bios?: Record<string, unknown>;
  network?: Record<string, unknown>[];

  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  uptime?: number;

  networkOnline?: boolean;
  batteryPercent?: number;

  currentUser?: string;
  sessionState?: "active" | "unavailable";
  currentApplication?: {
    processName: string;
    pid: number;
    capturedAt: string;
  } | null;
  sessionTelemetryAt?: string;
  sessionTelemetryStale?: boolean;
  lastHeartbeatLatencyMs?: number;

  status: "online" | "offline" | "disabled";
  lastSeenAt?: string;

  createdAt?: string;
  updatedAt?: string;
};

function authHeaders(
  token: string | undefined,
): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function request<T>(
  path: string,
  token: string | undefined,
): Promise<T> {
  if (!token) {
    throw new Error(
      "Authentication session is missing. Please login again.",
    );
  }

  const response = await fetch(
    `${apiBaseUrl}${path}`,
    {
      headers: authHeaders(token),
    },
  );

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | null;

  if (!response.ok) {
    throw new Error(
      body?.message ??
        `Request failed (${response.status})`,
    );
  }

  if (!body) {
    throw new Error("Invalid API response.");
  }

  return body.data;
}

export function fetchManagedDevices(
  token: string | undefined,
): Promise<ManagedDevice[]> {
  return request<ManagedDevice[]>(
    "/devices",
    token,
  );
}

export function fetchManagedDevice(
  deviceId: string,
  token: string | undefined,
): Promise<ManagedDevice> {
  return request<ManagedDevice>(
    `/devices/${encodeURIComponent(deviceId)}`,
    token,
  );
}

export type DeviceMetricRange =
  | "1h"
  | "24h"
  | "7d";

export type DeviceMetricPoint = {
  _id?: string;
  deviceId: string;

  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  uptime?: number;

  networkOnline?: boolean;
  batteryPercent?: number;

  recordedAt: string;
};

export type DeviceMetricsResponse = {
  deviceId: string;
  range: DeviceMetricRange;
  from: string;
  to: string;
  points: DeviceMetricPoint[];
};

export function fetchDeviceMetrics(
  deviceId: string,
  range: DeviceMetricRange,
  token: string | undefined,
): Promise<DeviceMetricsResponse> {
  return request<DeviceMetricsResponse>(
    `/devices/${encodeURIComponent(deviceId)}/metrics?range=${range}`,
    token,
  );
}

export type InstalledApplication = {
  name: string;
  version: string | null;
  publisher: string | null;
  installDate: string | null;
  scope: "machine" | "user";
  architecture: "64-bit" | "32-bit" | "user";
  source: "registry" | "unknown";
};

export type RunningApplication = {
  processName: string;
  pid: number;
  startedAt: string | null;
  cpuUsage: number | null;
  memoryBytes: number | null;
};

export type DeviceApplicationSnapshot = {
  _id?: string;
  deviceId: string;

  installedApplications: InstalledApplication[];
  runningApplications: RunningApplication[];

  collectedAt: string | null;
  reporterSource?: "agent-interactive" | "session-helper" | "unknown";
  sessionContext?: string;

  createdAt?: string;
  updatedAt?: string;
};

export function fetchDeviceApplications(
  deviceId: string,
  token: string | undefined,
): Promise<DeviceApplicationSnapshot> {
  return request<DeviceApplicationSnapshot>(
    `/devices/${encodeURIComponent(deviceId)}/applications`,
    token,
  );
}

export type ApplicationSessionRange =
  | "1h"
  | "24h"
  | "7d"
  | "30d";

export type DeviceApplicationSession = {
  _id?: string;
  deviceId: string;
  processName: string;
  pid: number;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DeviceApplicationSessionsResponse = {
  deviceId: string;
  range: ApplicationSessionRange;
  from: string;
  to: string;
  sessions: DeviceApplicationSession[];
};

export function fetchDeviceApplicationSessions(
  deviceId: string,
  range: ApplicationSessionRange,
  token: string | undefined,
): Promise<DeviceApplicationSessionsResponse> {
  return request<DeviceApplicationSessionsResponse>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/application-sessions?range=" +
      range,
    token,
  );
}

export type DeviceCommandStatus =
  | "queued"
  | "sent"
  | "acknowledged"
  | "running"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export type DeviceCommand = {
  _id?: string;
  commandId: string;
  deviceId: string;
  type:
    | "PING"
    | "INSTALL_APP"
    | "UNINSTALL_APP"
    | "UPDATE_APP"
    | "RESTART_DEVICE"
    | "SHUTDOWN_DEVICE";
  status: DeviceCommandStatus;
  payload?: unknown;
  result?: unknown;
  errorMessage?: string | null;
  requestedBy?: string | null;
  requestedAt?: string;
  sentAt?: string | null;
  acknowledgedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  attemptCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DeviceCommandsResponse = {
  deviceId: string;
  commands: DeviceCommand[];
};

async function postRequest<T>(
  path: string,
  token: string | undefined,
  body: unknown,
): Promise<T> {
  if (!token) {
    throw new Error(
      "Authentication session is missing. Please login again.",
    );
  }

  const response = await fetch(
    apiBaseUrl + path,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );

  const responseBody = (
    await response
      .json()
      .catch(() => null)
  ) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new Error(
      responseBody?.message ??
        "Request failed (" +
          response.status +
          ")",
    );
  }

  if (!responseBody) {
    throw new Error(
      "Invalid API response.",
    );
  }

  return responseBody.data;
}

async function patchRequest<T>(
  path: string,
  token: string | undefined,
  body: unknown,
): Promise<T> {
  if (!token) {
    throw new Error(
      "Authentication session is missing. Please login again.",
    );
  }

  const response = await fetch(
    apiBaseUrl + path,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );

  const responseBody = (
    await response
      .json()
      .catch(() => null)
  ) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new Error(
      responseBody?.message ??
        "Request failed (" +
          response.status +
          ")",
    );
  }

  if (!responseBody) {
    throw new Error(
      "Invalid API response.",
    );
  }

  return responseBody.data;
}

export function fetchDeviceCommands(
  deviceId: string,
  token: string | undefined,
): Promise<DeviceCommandsResponse> {
  return request<DeviceCommandsResponse>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/commands",
    token,
  );
}

export type DeviceUpdateStatus =
  | "update_available"
  | "download_started"
  | "download_verified"
  | "staging_started"
  | "staged"
  | "activation_requested"
  | "activation_started"
  | "service_stopped"
  | "payload_activated"
  | "service_started"
  | "health_pending"
  | "healthy"
  | "rollback_started"
  | "rolled_back"
  | "failed";

export type DeviceUpdateEvent = {
  _id?: string;
  deviceId: string;
  fromVersion?: string | null;
  toVersion?: string | null;
  packageId?: string | null;
  status: DeviceUpdateStatus;
  failureCategory?: string | null;
  safeErrorText?: string | null;
  metadata?: Record<string, unknown> | null;
  reportedAt: string;
  createdAt?: string;
};

export type DeviceUpdateSummary = {
  deviceId: string;
  currentVersion: string | null;
  targetVersion: string | null;
  lastUpdateCheck: string | null;
  lastSuccessfulUpdate: string | null;
  lastFailure: string | null;
  rollbackStatus: DeviceUpdateEvent | null;
  latest: DeviceUpdateEvent | null;
};

export type DeviceUpdateHistoryResponse = {
  deviceId: string;
  events: DeviceUpdateEvent[];
};

export function fetchDeviceUpdateStatus(
  deviceId: string,
  token: string | undefined,
): Promise<DeviceUpdateSummary> {
  return request<DeviceUpdateSummary>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/update-status",
    token,
  );
}

export function fetchDeviceUpdateHistory(
  deviceId: string,
  token: string | undefined,
): Promise<DeviceUpdateHistoryResponse> {
  return request<DeviceUpdateHistoryResponse>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/update-history",
    token,
  );
}

export type DeviceAuditHistoryEntry = {
  source:
    | "monitoring"
    | "command"
    | "application"
    | "policy"
    | "credential"
    | "remote_support"
    | "update";
  what: string;
  deviceId: string;
  when: string;
  result: string;
  actor?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeviceAuditHistoryResponse = {
  deviceId: string;
  entries: DeviceAuditHistoryEntry[];
};

export function fetchDeviceAuditHistory(
  deviceId: string,
  token: string | undefined,
): Promise<DeviceAuditHistoryResponse> {
  return request<DeviceAuditHistoryResponse>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/audit-history",
    token,
  );
}

export function sendDevicePingCommand(
  deviceId: string,
  token: string | undefined,
): Promise<DeviceCommand> {
  return postRequest<DeviceCommand>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/commands",
    token,
    {
      type: "PING",
    },
  );
}

export type DevicePowerCommandType =
  | "RESTART_DEVICE"
  | "SHUTDOWN_DEVICE";

export function sendDevicePowerAction(
  deviceId: string,
  commandType: DevicePowerCommandType,
  reason: string,
  delaySeconds: number,
  token: string | undefined,
): Promise<DeviceCommand> {
  return postRequest<DeviceCommand>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/power-actions",
    token,
    {
      type:
        commandType,

      payload: {
        reason,
        delaySeconds,
      },
    },
  );
}

export type SoftwareCatalogPackage = {
  _id?: string;
  packageId: string;

  name: string;
  version: string;
  publisher: string;

  packageType: "MSI";

  downloadUrl: string;
  sha256: string;
  productCode: string;

  enabled: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type SoftwareCatalogResponse = {
  packages: SoftwareCatalogPackage[];
};

export type DeviceAppCommandType =
  | "INSTALL_APP"
  | "UNINSTALL_APP"
  | "UPDATE_APP";

export function fetchSoftwareCatalog(
  token: string | undefined,
): Promise<SoftwareCatalogResponse> {
  return request<SoftwareCatalogResponse>(
    "/devices/software-catalog",
    token,
  );
}

export type SoftwareCatalogPackageInput = {
  name: string;
  version: string;
  publisher: string;
  packageType: "MSI";
  downloadUrl: string;
  sha256: string;
  productCode: string;
  enabled: boolean;
};

export function createSoftwareCatalogPackage(
  input: SoftwareCatalogPackageInput,
  token: string | undefined,
): Promise<SoftwareCatalogPackage> {
  return postRequest<SoftwareCatalogPackage>(
    "/devices/software-catalog",
    token,
    input,
  );
}

export function updateSoftwareCatalogPackage(
  packageId: string,
  input: Partial<SoftwareCatalogPackageInput>,
  token: string | undefined,
): Promise<SoftwareCatalogPackage> {
  return patchRequest<SoftwareCatalogPackage>(
    "/devices/software-catalog/" +
      encodeURIComponent(packageId),
    token,
    input,
  );
}

export function sendDeviceAppCommand(
  deviceId: string,
  commandType: DeviceAppCommandType,
  packageId: string,
  token: string | undefined,
): Promise<DeviceCommand> {
  return postRequest<DeviceCommand>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/commands",
    token,
    {
      type:
        commandType,

      payload: {
        packageId,
      },
    },
  );
}

export type ApplicationPolicyAction =
  | "block"
  | "allow";

export type DeviceApplicationPolicyRule = {
  _id?: string;

  ruleId: string;
  deviceId: string;

  processName: string;
  processKey: string;

  displayName?: string;

  action:
    ApplicationPolicyAction;

  enabled: boolean;

  enforcementStatus: "pending" | "applied" | "failed";
  enforcementError?: string;
  enforcedAt?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type DeviceApplicationPolicyResponse = {
  deviceId: string;

  rules:
    DeviceApplicationPolicyRule[];
};

export function fetchDeviceApplicationPolicy(
  deviceId: string,
  token: string | undefined,
): Promise<DeviceApplicationPolicyResponse> {
  return request<DeviceApplicationPolicyResponse>(
    "/devices/" +
      encodeURIComponent(
        deviceId,
      ) +
      "/application-policy",
    token,
  );
}

export function setDeviceApplicationPolicy(
  deviceId: string,
  processName: string,
  displayName: string,
  action: ApplicationPolicyAction,
  token: string | undefined,
): Promise<DeviceApplicationPolicyRule> {
  return postRequest<DeviceApplicationPolicyRule>(
    "/devices/" +
      encodeURIComponent(
        deviceId,
      ) +
      "/application-policy",
    token,
    {
      processName,
      displayName,
      action,
    },
  );
}

export type RemoteSupportSessionStatus =
  | "pending_consent"
  | "declined"
  | "ready"
  | "active"
  | "ended"
  | "expired";

export type RemoteSupportSession = {
  sessionId: string;
  deviceId: string;

  requestedBy: string;
  requestedByRole: string;

  status:
    RemoteSupportSessionStatus;

  requestedAt: string;
  consentedAt?: string;
  declinedAt?: string;
  startedAt?: string;
  endedAt?: string;

  expiresAt: string;

  endReason?: string;

  capabilities: {
    screenView: boolean;
    remoteControl: boolean;
    recording: boolean;
  };
};

export type CreateRemoteSupportSessionResponse = {
  session:
    RemoteSupportSession;

  viewerToken:
    string;
};

export function createRemoteSupportSession(
  deviceId: string,
  token: string | undefined,
): Promise<CreateRemoteSupportSessionResponse> {
  return postRequest<CreateRemoteSupportSessionResponse>(
    "/devices/" +
      encodeURIComponent(
        deviceId,
      ) +
      "/remote-sessions",
    token,
    {},
  );
}

export function fetchRemoteSupportSession(
  deviceId: string,
  sessionId: string,
  token: string | undefined,
): Promise<RemoteSupportSession> {
  return request<RemoteSupportSession>(
    "/devices/" +
      encodeURIComponent(
        deviceId,
      ) +
      "/remote-sessions/" +
      encodeURIComponent(
        sessionId,
      ),
    token,
  );
}

export function fetchCurrentRemoteSupportSession(
  deviceId: string,
  token: string | undefined,
): Promise<RemoteSupportSession | null> {
  return request<RemoteSupportSession | null>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/remote-sessions/current",
    token,
  );
}

export function issueRemoteSupportViewerToken(
  deviceId: string,
  sessionId: string,
  token: string | undefined,
): Promise<CreateRemoteSupportSessionResponse> {
  return postRequest<CreateRemoteSupportSessionResponse>(
    "/devices/" +
      encodeURIComponent(
        deviceId,
      ) +
      "/remote-sessions/" +
      encodeURIComponent(
        sessionId,
      ) +
      "/viewer-token",
    token,
    {},
  );
}

export function endRemoteSupportSession(
  deviceId: string,
  sessionId: string,
  token: string | undefined,
): Promise<RemoteSupportSession> {
  return postRequest<RemoteSupportSession>(
    "/devices/" +
      encodeURIComponent(
        deviceId,
      ) +
      "/remote-sessions/" +
      encodeURIComponent(
        sessionId,
      ) +
      "/end",
    token,
    {
      reason:
        "Administrator ended remote support session",
    },
  );
}

export function getMonitoringSocketUrl():
  string {
  return getApiOrigin();
}

export type AgentUpdateOperationalStatus = {
  releaseConfigured: boolean;
  approvedVersion: string | null;
  mandatory: boolean | null;
  publishedAt: string | null;
  activationIsPerDeviceLocalSetting: true;
  activationEnvVarName: string;
};

export function fetchAgentUpdateOperationalStatus(
  token: string | undefined,
): Promise<AgentUpdateOperationalStatus> {
  return request<AgentUpdateOperationalStatus>(
    "/devices/agent-update/operational-status",
    token,
  );
}

export type AcknowledgeAlertResponse = {
  alertId: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
};

export function acknowledgeMonitoringAlert(
  alertId: string,
  token: string | undefined,
): Promise<AcknowledgeAlertResponse> {
  return postRequest<AcknowledgeAlertResponse>(
    "/monitoring/alerts/" +
      encodeURIComponent(alertId) +
      "/acknowledge",
    token,
    {},
  );
}

export type DeviceCredentialStatusValue =
  | "active"
  | "revoked";

export type DeviceCredentialStatus = {
  deviceId: string;
  status: DeviceCredentialStatusValue;
  credentialVersion: number;
  issuedAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  rotationRequestedAt: string | null;
  rotationReason: string | null;
  pendingCredentialVersion: number | null;
  pendingIssuedAt: string | null;
  pendingExpiresAt: string | null;
};

export function fetchDeviceCredentialStatus(
  deviceId: string,
  token: string | undefined,
): Promise<DeviceCredentialStatus> {
  return request<DeviceCredentialStatus>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/credential",
    token,
  );
}

export type RequestDeviceCredentialRotationResponse = {
  deviceId: string;
  rotationRequestedAt: string;
  credentialVersion: number;
};

export function requestDeviceCredentialRotation(
  deviceId: string,
  reason: string,
  token: string | undefined,
): Promise<RequestDeviceCredentialRotationResponse> {
  return postRequest<RequestDeviceCredentialRotationResponse>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/credential/rotation-request",
    token,
    {
      reason,
    },
  );
}

export type RevokeDeviceCredentialResponse = {
  deviceId: string;
  status: DeviceCredentialStatusValue;
};

export function revokeDeviceCredential(
  deviceId: string,
  token: string | undefined,
): Promise<RevokeDeviceCredentialResponse> {
  return postRequest<RevokeDeviceCredentialResponse>(
    "/devices/" +
      encodeURIComponent(deviceId) +
      "/credential/revoke",
    token,
    {},
  );
}
