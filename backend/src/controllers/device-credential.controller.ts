import type {
  RequestHandler,
} from "express";

import {
  deviceCredentialService,
} from "../services/device-credential.service.js";

import {
  AppError,
} from "../utils/app-error.js";

function requiredDeviceId(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new AppError(
      "Device ID is required",
      400,
    );
  }

  return value.trim();
}

function optionalString(
  value: unknown,
): string | undefined {
  return typeof value === "string"
    ? value.trim() ||
        undefined
    : undefined;
}

export class DeviceCredentialController {
  getStatus:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const deviceId =
        requiredDeviceId(
          req.params.deviceId,
        );

      const status =
        await deviceCredentialService
          .getStatus(
            deviceId,
          );

      if (!status) {
        throw new AppError(
          "Device credential not found",
          404,
        );
      }

      res.status(200).json({
        success: true,

        data: {
          deviceId:
            status.deviceId,

          status:
            status.status,

          credentialVersion:
            status
              .credentialVersion,

          issuedAt:
            status.issuedAt,

          rotatedAt:
            status.rotatedAt ??
            null,

          revokedAt:
            status.revokedAt ??
            null,

          lastUsedAt:
            status.lastUsedAt ??
            null,

          rotationRequestedAt:
            status
              .rotationRequestedAt ??
            null,

          rotationReason:
            status
              .rotationReason ??
            null,

          pendingCredentialVersion:
            status
              .pendingCredentialVersion ??
            null,

          pendingIssuedAt:
            status
              .pendingIssuedAt ??
            null,

          pendingExpiresAt:
            status
              .pendingExpiresAt ??
            null,
        },
      });
    };

  requestRotation:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const deviceId =
        requiredDeviceId(
          req.params.deviceId,
        );

      if (!req.user?.id) {
        throw new AppError(
          "Authentication required",
          401,
        );
      }

      const result =
        await deviceCredentialService
          .requestRotation(
            deviceId,
            req.user.id,
            optionalString(
              req.body?.reason,
            ),
          );

      res.status(202).json({
        success: true,

        message:
          "Device credential rotation requested",

        data: {
          deviceId:
            result.deviceId,

          rotationRequestedAt:
            result
              .rotationRequestedAt,

          credentialVersion:
            result
              .credentialVersion,
        },
      });
    };

  getRotationState:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const deviceId =
        requiredDeviceId(
          req.query.deviceId,
        );

      const state =
        await deviceCredentialService
          .getRotationState(
            deviceId,
          );

      res.status(200).json({
        success: true,
        data: state,
      });
    };

  prepareRotation:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const deviceId =
        requiredDeviceId(
          req.body?.deviceId,
        );

      const prepared =
        await deviceCredentialService
          .prepareRotation(
            deviceId,
          );

      /*
       * Raw pending token is returned
       * exactly to the authenticated
       * endpoint.
       *
       * Never cache this response.
       */
      res.setHeader(
        "Cache-Control",
        "no-store",
      );

      res.setHeader(
        "Pragma",
        "no-cache",
      );

      res.status(200).json({
        success: true,

        data: {
          deviceId:
            prepared.deviceId,

          deviceToken:
            prepared.deviceToken,

          credentialVersion:
            prepared
              .credentialVersion,

          issuedAt:
            prepared.issuedAt,

          expiresAt:
            prepared.expiresAt,
        },
      });
    };

  confirmRotation:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const deviceId =
        requiredDeviceId(
          req.body?.deviceId,
        );

      const pendingTokenProof =
        optionalString(
          req.body
            ?.pendingTokenProof,
        );

      if (!pendingTokenProof) {
        throw new AppError(
          "Credential rotation confirmation proof is required",
          400,
        );
      }

      const result =
        await deviceCredentialService
          .confirmRotation(
            deviceId,
            pendingTokenProof,
          );

      res.status(200).json({
        success: true,

        message:
          "Device credential rotation confirmed",

        data: result,
      });
    };

  revoke:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const deviceId =
        requiredDeviceId(
          req.params.deviceId,
        );

      const existing =
        await deviceCredentialService
          .getStatus(
            deviceId,
          );

      if (!existing) {
        throw new AppError(
          "Device credential not found",
          404,
        );
      }

      if (
        existing.status ===
        "revoked"
      ) {
        res.status(200).json({
          success: true,

          message:
            "Device credential is already revoked",

          data: {
            deviceId,
            status:
              "revoked",
          },
        });

        return;
      }

      const revoked =
        await deviceCredentialService
          .revokeForDevice(
            deviceId,
          );

      if (!revoked) {
        throw new AppError(
          "Unable to revoke device credential",
          409,
        );
      }

      res.status(200).json({
        success: true,

        message:
          "Device credential revoked",

        data: {
          deviceId,
          status:
            "revoked",
        },
      });
    };
}

export const deviceCredentialController =
  new DeviceCredentialController();
