import {
  DeviceApplicationPolicyRuleModel,
} from "../models/device-application-policy.model.js";

import {
  DeviceApplicationSessionModel,
} from "../models/device-application-session.model.js";

import {
  DeviceCommandModel,
} from "../models/device-command.model.js";

import {
  DeviceCredentialModel,
} from "../models/device-credential.model.js";

import {
  DeviceMetricModel,
} from "../models/device-metric.model.js";

import {
  DeviceUpdateEventModel,
} from "../models/device-update-event.model.js";

import {
  RemoteSupportSessionModel,
} from "../models/remote-support-session.model.js";

import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

import {
  AppError,
} from "../utils/app-error.js";

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
  when: Date;
  result: string;
  actor?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

function requiredDeviceId(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 100
  ) {
    throw new AppError(
      "Device ID is required",
      400,
    );
  }

  return value.trim();
}

function asDate(
  value: unknown,
): Date {
  return value instanceof Date
    ? value
    : new Date(String(value));
}

function sortEntries(
  entries: DeviceAuditHistoryEntry[],
): DeviceAuditHistoryEntry[] {
  return entries.sort(
    (left, right) =>
      right.when.getTime() -
      left.when.getTime(),
  );
}

export class DeviceAuditHistoryService {
  async getHistory(
    deviceIdInput: unknown,
  ) {
    const deviceId =
      requiredDeviceId(
        deviceIdInput,
      );

    const device =
      await managedDeviceRepository
        .findByDeviceId(
          deviceId,
        );

    if (!device) {
      throw new AppError(
        "Managed device not found",
        404,
      );
    }

    const [
      metrics,
      commands,
      applicationSessions,
      policies,
      credential,
      remoteSessions,
      updateEvents,
    ] =
      await Promise.all([
        DeviceMetricModel
          .find({
            deviceId,
          })
          .sort({
            recordedAt: -1,
          })
          .limit(20)
          .lean(),
        DeviceCommandModel
          .find({
            deviceId,
          })
          .sort({
            createdAt: -1,
          })
          .limit(50)
          .lean(),
        DeviceApplicationSessionModel
          .find({
            deviceId,
          })
          .sort({
            startedAt: -1,
          })
          .limit(25)
          .lean(),
        DeviceApplicationPolicyRuleModel
          .find({
            deviceId,
          })
          .sort({
            updatedAt: -1,
          })
          .limit(50)
          .lean(),
        DeviceCredentialModel
          .findOne({
            deviceId,
          })
          .lean(),
        RemoteSupportSessionModel
          .find({
            deviceId,
          })
          .select(
            "-viewerTokenHash -endpointTokenHash",
          )
          .sort({
            requestedAt: -1,
          })
          .limit(50)
          .lean(),
        DeviceUpdateEventModel
          .find({
            deviceId,
          })
          .sort({
            reportedAt: -1,
          })
          .limit(50)
          .lean(),
      ]);

    const entries:
      DeviceAuditHistoryEntry[] = [];

    for (const metric of metrics) {
      entries.push({
        source:
          "monitoring",
        what:
          "Device metric recorded",
        deviceId,
        when:
          asDate(
            metric.recordedAt,
          ),
        result:
          metric.networkOnline === false
            ? "network_offline"
            : "recorded",
        metadata: {
          cpuUsage:
            metric.cpuUsage ?? null,
          ramUsage:
            metric.ramUsage ?? null,
          diskUsage:
            metric.diskUsage ?? null,
          batteryPercent:
            metric.batteryPercent ?? null,
        },
      });
    }

    for (const command of commands) {
      entries.push({
        source:
          "command",
        what:
          String(command.type),
        deviceId,
        when:
          asDate(
            command.requestedAt ??
              command.createdAt,
          ),
        result:
          String(command.status),
        actor:
          command.requestedBy ?? null,
        actorRole:
          command.requestedByRole ?? null,
        reason:
          command.errorMessage ?? null,
        metadata: {
          commandId:
            command.commandId,
          authorizationPermission:
            command.authorizationPermission ??
            null,
          completedAt:
            command.completedAt ?? null,
        },
      });
    }

    for (const session of applicationSessions) {
      entries.push({
        source:
          "application",
        what:
          "Foreground application session",
        deviceId,
        when:
          asDate(
            session.startedAt,
          ),
        result:
          "recorded",
        metadata: {
          processName:
            session.processName,
          durationSeconds:
            session.durationSeconds,
          endedAt:
            session.endedAt,
        },
      });
    }

    for (const policy of policies) {
      const policyRecord =
        policy as typeof policy & {
          createdAt?: Date;
          updatedAt?: Date;
        };

      entries.push({
        source:
          "policy",
        what:
          "Application policy " +
          policy.action,
        deviceId,
        when:
          asDate(
            policyRecord.updatedAt ??
              policyRecord.createdAt,
          ),
        result:
          policy.enabled
            ? "enabled"
            : "disabled",
        actor:
          policy.updatedBy,
        metadata: {
          ruleId:
            policy.ruleId,
          processName:
            policy.processName,
          action:
            policy.action,
        },
      });
    }

    if (credential) {
      entries.push({
        source:
          "credential",
        what:
          "Device credential status",
        deviceId,
        when:
          asDate(
            credential.rotatedAt ??
              credential.revokedAt ??
              credential.issuedAt,
          ),
        result:
          credential.status,
        actor:
          credential.rotationRequestedBy ??
          null,
        reason:
          credential.rotationReason ??
          null,
        metadata: {
          credentialVersion:
            credential.credentialVersion,
          rotationRequestedAt:
            credential.rotationRequestedAt ??
            null,
          pendingCredentialVersion:
            credential.pendingCredentialVersion ??
            null,
        },
      });
    }

    for (const remote of remoteSessions) {
      entries.push({
        source:
          "remote_support",
        what:
          "Remote support session",
        deviceId,
        when:
          asDate(
            remote.requestedAt,
          ),
        result:
          remote.status,
        actor:
          remote.requestedBy,
        actorRole:
          remote.requestedByRole,
        reason:
          remote.endReason ?? null,
        metadata: {
          sessionId:
            remote.sessionId,
          consentedAt:
            remote.consentedAt ?? null,
          declinedAt:
            remote.declinedAt ?? null,
          startedAt:
            remote.startedAt ?? null,
          endedAt:
            remote.endedAt ?? null,
          capabilities:
            remote.capabilities,
        },
      });
    }

    for (const update of updateEvents) {
      entries.push({
        source:
          "update",
        what:
          "Agent update lifecycle",
        deviceId,
        when:
          asDate(
            update.reportedAt,
          ),
        result:
          update.status,
        reason:
          update.safeErrorText ?? null,
        metadata: {
          fromVersion:
            update.fromVersion ?? null,
          toVersion:
            update.toVersion ?? null,
          packageId:
            update.packageId ?? null,
          failureCategory:
            update.failureCategory ?? null,
        },
      });
    }

    return {
      deviceId,
      entries:
        sortEntries(
          entries,
        ).slice(
          0,
          200,
        ),
    };
  }
}

export const deviceAuditHistoryService =
  new DeviceAuditHistoryService();
