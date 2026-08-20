import {
  deviceAuthMigrationController,
} from "../controllers/device-auth-migration.controller.js";
import {
  migrationCompatibilityEnabled,
  secureSecretEqual,
} from "../utils/secure-secret.js";
import {
  Router,
  type RequestHandler,
} from "express";

import {
  managedDeviceController,
} from "../controllers/managed-device.controller.js";
import {
  agentUpdateController,
} from "../controllers/agent-update.controller.js";

import {
  deviceUpdateEventController,
} from "../controllers/device-update-event.controller.js";

import {
  deviceAuditHistoryController,
} from "../controllers/device-audit-history.controller.js";

import {
  deviceEnrollmentController,
} from "../controllers/device-enrollment.controller.js";

import {
  deviceEnrollmentTokenController,
} from "../controllers/device-enrollment-token.controller.js";

import {
  deviceEnrollmentTokenService,
} from "../services/device-enrollment-token.service.js";

import {
  deviceCredentialController,
} from "../controllers/device-credential.controller.js";

import {
  deviceApplicationController,
} from "../controllers/device-application.controller.js";

import {
  deviceApplicationSessionController,
} from "../controllers/device-application-session.controller.js";

import {
  deviceCommandController,
} from "../controllers/device-command.controller.js";

import {
  softwareCatalogController,
} from "../controllers/software-catalog.controller.js";

import {
  deviceApplicationPolicyController,
} from "../controllers/device-application-policy.controller.js";

import {
  remoteSupportSessionController,
} from "../controllers/remote-support-session.controller.js";

import {
  asyncHandler,
} from "../middleware/async-handler.js";

import {
  verifyDeviceAgent,
} from "../middleware/device-agent-auth.middleware.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  requireOwnerOrExplicitPermission,
  requireAdministratorMonitoringPermission,
  requireAdministratorDeviceCommandPermission,
} from "../middleware/rbac.middleware.js";

export const deviceRoutes =
  Router();

/**
 * Device Agent authentication.
 * Agent must send:
 * x-device-key: SERVICE_API_KEY
 */
/**
 * Bootstrap enrollment authentication.
 *
 * DEVICE_ENROLLMENT_KEY can be configured
 * separately from the legacy service key.
 *
 * During migration only, SERVICE_API_KEY is
 * used as a fallback.
 *
 * The fallback will be removed at the final
 * Phase 20 cutover.
 */
const verifyDeviceEnrollment:
  RequestHandler = (
    req,
    res,
    next,
  ) => {
    void (async () => {
      const dedicatedKey =
        process.env
          .DEVICE_ENROLLMENT_KEY
          ?.trim() ||
        "";

      const allowLegacyFallback =
        migrationCompatibilityEnabled(
          process.env
            .ALLOW_LEGACY_ENROLLMENT_FALLBACK,
        );

      const legacyKey =
        allowLegacyFallback
          ? process.env
              .SERVICE_API_KEY
              ?.trim() ||
            ""
          : "";

      const expectedKey =
        dedicatedKey ||
        legacyKey;

      const receivedKey =
        req.header(
          "x-device-enrollment-key",
        )?.trim() ||
        "";

      if (
        expectedKey &&
        secureSecretEqual(
          expectedKey,
          receivedKey,
        )
      ) {
        res.locals.deviceEnrollmentCredential = {
          type:
            "static",
        };

        next();
        return;
      }

      const oneTimeCredential =
        await deviceEnrollmentTokenService
          .verify(
            receivedKey,
          );

      if (oneTimeCredential) {
        res.locals.deviceEnrollmentCredential = {
          type:
            "one-time",

          tokenHash:
            oneTimeCredential
              .tokenHash,
        };

        next();
        return;
      }

      if (receivedKey) {
        res.status(401).json({
          success: false,
          message:
            "Invalid device enrollment authentication",
        });

        return;
      }

      if (!expectedKey) {
        res.status(500).json({
          success: false,
          message:
            "Device enrollment key is not configured",
        });

        return;
      }

      res.status(401).json({
        success: false,
        message:
          "Invalid device enrollment authentication",
      });

      return;
    })().catch(
      next,
    );
  };
/**
 * Device Agent endpoints
 */

deviceRoutes.post(
  "/enrollment-credentials",
  authenticate,
  requireAdministratorMonitoringPermission(),
  asyncHandler(
    deviceEnrollmentTokenController
      .issue,
  ),
);

deviceRoutes.post(
  "/enroll",
  verifyDeviceEnrollment,
  asyncHandler(
    deviceEnrollmentController
      .enroll,
  ),
);

deviceRoutes.get(
  "/credential/rotation",
  verifyDeviceAgent,
  asyncHandler(
    deviceCredentialController
      .getRotationState,
  ),
);

deviceRoutes.post(
  "/credential/rotation/prepare",
  verifyDeviceAgent,
  asyncHandler(
    deviceCredentialController
      .prepareRotation,
  ),
);

deviceRoutes.post(
  "/credential/rotation/confirm",
  verifyDeviceAgent,
  asyncHandler(
    deviceCredentialController
      .confirmRotation,
  ),
);
deviceRoutes.post(
  "/register",
  verifyDeviceAgent,
  asyncHandler(
    managedDeviceController
      .register,
  ),
);

deviceRoutes.post(
  "/heartbeat",
  verifyDeviceAgent,
  asyncHandler(
    managedDeviceController
      .heartbeat,
  ),
);
deviceRoutes.get(
  "/agent-update/manifest",
  verifyDeviceAgent,
  asyncHandler(
    agentUpdateController
      .getManifest,
  ),
);
deviceRoutes.get(
  "/agent-update/package/:version",
  verifyDeviceAgent,
  asyncHandler(
    agentUpdateController
      .getPackage,
  ),
);

deviceRoutes.post(
  "/agent-update/status",
  verifyDeviceAgent,
  asyncHandler(
    deviceUpdateEventController
      .recordStatus,
  ),
);

deviceRoutes.post(
  "/applications/snapshot",
  verifyDeviceAgent,
  asyncHandler(
    deviceApplicationController
      .saveSnapshot,
  ),
);

deviceRoutes.post(
  "/applications/session",
  verifyDeviceAgent,
  asyncHandler(
    deviceApplicationSessionController
      .saveSession,
  ),
);

deviceRoutes.get(
  "/commands/next",
  verifyDeviceAgent,
  asyncHandler(
    deviceCommandController
      .getNextCommand,
  ),
);

deviceRoutes.post(
  "/commands/status",
  verifyDeviceAgent,
  asyncHandler(
    deviceCommandController
      .updateStatus,
  ),
);

deviceRoutes.get(
  "/application-policy",
  verifyDeviceAgent,
  asyncHandler(
    deviceApplicationPolicyController
      .getAgentPolicy,
  ),
);

deviceRoutes.post(
  "/application-policy/status",
  verifyDeviceAgent,
  asyncHandler(
    deviceApplicationPolicyController
      .reportAgentEnforcement,
  ),
);

deviceRoutes.get(
  "/remote-sessions/pending",
  verifyDeviceAgent,
  asyncHandler(
    remoteSupportSessionController
      .getPendingForAgent,
  ),
);

deviceRoutes.post(
  "/remote-sessions/:sessionId/consent",
  verifyDeviceAgent,
  asyncHandler(
    remoteSupportSessionController
      .respondToConsent,
  ),
);

deviceRoutes.post(
  "/remote-sessions/:sessionId/end",
  verifyDeviceAgent,
  asyncHandler(
    remoteSupportSessionController
      .endFromAgent,
  ),
);

/**
 * Admin endpoints
 */

/**
 * Approved Software Catalog
 */

deviceRoutes.get(
  "/software-catalog",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.software.manage",
  ),
  asyncHandler(
    softwareCatalogController
      .listPackages,
  ),
);

deviceRoutes.post(
  "/software-catalog",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.software.manage",
  ),
  asyncHandler(
    softwareCatalogController
      .createPackage,
  ),
);

deviceRoutes.get(
  "/software-catalog/:packageId",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.software.manage",
  ),
  asyncHandler(
    softwareCatalogController
      .getPackage,
  ),
);

deviceRoutes.patch(
  "/software-catalog/:packageId",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.software.manage",
  ),
  asyncHandler(
    softwareCatalogController
      .updatePackage,
  ),
);


deviceRoutes.get(
  "/",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    managedDeviceController
      .list,
  ),
);

deviceRoutes.post(
  "/:deviceId/remote-sessions",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.remote_support.create",
  ),
  asyncHandler(
    remoteSupportSessionController
      .create,
  ),
);

deviceRoutes.get(
  "/:deviceId/remote-sessions/current",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.remote_support.create",
  ),
  asyncHandler(
    remoteSupportSessionController
      .getCurrentAdminSession,
  ),
);

deviceRoutes.get(
  "/:deviceId/remote-sessions/:sessionId",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.remote_support.create",
  ),
  asyncHandler(
    remoteSupportSessionController
      .getAdminSession,
  ),
);

deviceRoutes.post(
  "/:deviceId/remote-sessions/:sessionId/viewer-token",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.remote_support.create",
  ),
  asyncHandler(
    remoteSupportSessionController
      .issueViewerToken,
  ),
);

deviceRoutes.post(
  "/:deviceId/remote-sessions/:sessionId/end",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.remote_support.create",
  ),
  asyncHandler(
    remoteSupportSessionController
      .end,
  ),
);

deviceRoutes.get(
  "/:deviceId/application-policy",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.restriction.manage",
  ),
  asyncHandler(
    deviceApplicationPolicyController
      .getAdminPolicy,
  ),
);

deviceRoutes.post(
  "/:deviceId/application-policy",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.restriction.manage",
  ),
  asyncHandler(
    deviceApplicationPolicyController
      .setPolicy,
  ),
);

deviceRoutes.get(
  "/:deviceId/metrics",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    managedDeviceController
      .getMetrics,
  ),
);

deviceRoutes.get(
  "/:deviceId/applications",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    deviceApplicationController
      .getSnapshot,
  ),
);

deviceRoutes.get(
  "/:deviceId/application-sessions",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    deviceApplicationSessionController
      .getSessions,
  ),
);

deviceRoutes.post(
  "/:deviceId/commands",
  authenticate,
  requireAdministratorDeviceCommandPermission,
  asyncHandler(
    deviceCommandController
      .createCommand,
  ),
);

deviceRoutes.post(
  "/:deviceId/power-actions",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.command.power",
  ),
  asyncHandler(
    deviceCommandController
      .createPowerCommand,
  ),
);

deviceRoutes.get(
  "/:deviceId/commands",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.command.view",
  ),
  asyncHandler(
    deviceCommandController
      .getDeviceCommands,
  ),
);

deviceRoutes.post(
  "/:deviceId/credential/rotation-request",
  authenticate,
  requireAdministratorMonitoringPermission(),
  requireOwnerOrExplicitPermission(
    "device.credential.rotate",
  ),
  asyncHandler(
    deviceCredentialController
      .requestRotation,
  ),
);
deviceRoutes.get(
  "/:deviceId/update-status",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    deviceUpdateEventController
      .getSummary,
  ),
);
deviceRoutes.get(
  "/:deviceId/update-history",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    deviceUpdateEventController
      .getHistory,
  ),
);
deviceRoutes.get(
  "/agent-update/operational-status",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    agentUpdateController
      .getOperationalStatus,
  ),
);
deviceRoutes.get(
  "/:deviceId/audit-history",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    deviceAuditHistoryController
      .getHistory,
  ),
);
deviceRoutes.get(
  "/security/auth-migration-status",
  authenticate,
  requireAdministratorMonitoringPermission(),
  requireOwnerOrExplicitPermission(
    "device.auth.migration_status",
  ),
  asyncHandler(
    deviceAuthMigrationController
      .getStatus,
  ),
);
deviceRoutes.get(
  "/:deviceId/credential",
  authenticate,
  requireAdministratorMonitoringPermission(),
  requireOwnerOrExplicitPermission(
    "device.credential.view",
  ),
  asyncHandler(
    deviceCredentialController
      .getStatus,
  ),
);

deviceRoutes.post(
  "/:deviceId/credential/revoke",
  authenticate,
  requireAdministratorMonitoringPermission(),
  requireOwnerOrExplicitPermission(
    "device.credential.revoke",
  ),
  asyncHandler(
    deviceCredentialController
      .revoke,
  ),
);
deviceRoutes.get(
  "/:deviceId",
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
  asyncHandler(
    managedDeviceController
      .getByDeviceId,
  ),
);













