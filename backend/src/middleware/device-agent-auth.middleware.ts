import {
  migrationCompatibilityEnabled,
} from "../utils/secure-secret.js";
import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import type {
  Request,
  RequestHandler,
} from "express";

import {
  deviceCredentialService,
} from "../services/device-credential.service.js";

function cleanString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function hashSecret(
  value: string,
): Buffer {
  return createHash("sha256")
    .update(
      value,
      "utf8",
    )
    .digest();
}

function secretsMatch(
  expected: string,
  received: string,
): boolean {
  if (
    !expected ||
    !received
  ) {
    return false;
  }

  const expectedHash =
    hashSecret(
      expected,
    );

  const receivedHash =
    hashSecret(
      received,
    );

  return timingSafeEqual(
    expectedHash,
    receivedHash,
  );
}

function getBodyDeviceId(
  req: Request,
): string {
  if (
    typeof req.body !== "object" ||
    req.body === null
  ) {
    return "";
  }

  return cleanString(
    (
      req.body as {
        deviceId?: unknown;
      }
    ).deviceId,
  );
}

function getQueryDeviceId(
  req: Request,
): string {
  return cleanString(
    req.query.deviceId,
  );
}

function getParamDeviceId(
  req: Request,
): string {
  return cleanString(
    req.params.deviceId,
  );
}

function requestTargetsMatchDevice(
  req: Request,
  authenticatedDeviceId: string,
): boolean {
  const targetIds = [
    getBodyDeviceId(req),
    getQueryDeviceId(req),
    getParamDeviceId(req),
  ].filter(
    (value) =>
      Boolean(value),
  );

  return targetIds.every(
    (value) =>
      value ===
      authenticatedDeviceId,
  );
}

async function verifyPerDeviceCredential(
  req: Request,
): Promise<boolean> {
  const deviceId =
    cleanString(
      req.header(
        "x-device-id",
      ),
    );

  const deviceToken =
    cleanString(
      req.header(
        "x-device-token",
      ),
    );

  if (
    !deviceId ||
    !deviceToken
  ) {
    return false;
  }

  /*
   * A credential issued to one device
   * must never authorize access to
   * another deviceId supplied in body,
   * query, or route parameters.
   */
  if (
    !requestTargetsMatchDevice(
      req,
      deviceId,
    )
  ) {
    return false;
  }

  return deviceCredentialService
    .verify(
      deviceId,
      deviceToken,
    );
}

function hasPerDeviceAuthAttempt(
  req: Request,
): boolean {
  return Boolean(
    cleanString(
      req.header(
        "x-device-token",
      ),
    ) ||
    cleanString(
      req.header(
        "x-device-id",
      ),
    ),
  );
}

function verifyLegacyCredential(
  req: Request,
): boolean {
  const expectedKey =
    process.env
      .SERVICE_API_KEY
      ?.trim() ||
    "";

  const receivedKey =
    cleanString(
      req.header(
        "x-device-key",
      ),
    );

  return secretsMatch(
    expectedKey,
    receivedKey,
  );
}

export const verifyDeviceAgent:
  RequestHandler =
  async (
    req,
    res,
    next,
  ) => {
    try {
      /*
       * NEW authentication path.
       *
       * If a caller attempts per-device
       * authentication, an invalid new
       * credential is rejected.
       *
       * We deliberately DO NOT downgrade
       * to the legacy shared key.
       */
      if (
        hasPerDeviceAuthAttempt(
          req,
        )
      ) {
        const authenticated =
          await verifyPerDeviceCredential(
            req,
          );

        if (
          !authenticated
        ) {
          res.status(401).json({
            success: false,
            message:
              "Invalid device authentication",
          });

          return;
        }

        next();
        return;
      }

      /*
       * Temporary Phase 20 migration
       * compatibility.
       *
       * Existing installed agents still
       * use x-device-key until the agent
       * cutover is deployed.
       */
      const legacyAuthEnabled =
        migrationCompatibilityEnabled(
          process.env
            .ALLOW_LEGACY_DEVICE_AUTH,
        );

      if (!legacyAuthEnabled) {
        res.status(401).json({
          success: false,
          message:
            "Invalid device authentication",
        });

        return;
      }
      const legacyExpectedKey =
        process.env
          .SERVICE_API_KEY
          ?.trim() ||
        "";

      if (!legacyExpectedKey) {
        res.status(500).json({
          success: false,
          message:
            "Legacy device authentication is not configured",
        });

        return;
      }

      if (
        !verifyLegacyCredential(
          req,
        )
      ) {
        res.status(401).json({
          success: false,
          message:
            "Invalid device authentication",
        });

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

