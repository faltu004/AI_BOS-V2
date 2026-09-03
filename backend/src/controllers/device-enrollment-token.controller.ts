import type {
  RequestHandler,
} from "express";

import {
  deviceEnrollmentTokenService,
} from "../services/device-enrollment-token.service.js";
import {
  auditLogService,
} from "../services/audit-log.service.js";
import {
  userRepository,
} from "../repositories/user.repository.js";
import {
  AppError,
} from "../utils/app-error.js";

export class DeviceEnrollmentTokenController {
  issue:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const issued =
        await deviceEnrollmentTokenService
          .issue({
            createdBy:
              req.user?.id ?? "",
            ttlMinutes:
              (
                req.body as {
                  ttlMinutes?: unknown;
                } | undefined
              )?.ttlMinutes,
          });

      res.setHeader(
        "Cache-Control",
        "no-store",
      );

      res.setHeader(
        "Pragma",
        "no-cache",
      );

      res.status(201).json({
        success: true,
        message:
          "Device enrollment credential issued",
        data: issued,
      });
    };

  issueForCurrentDevice:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const actorUserId =
        req.user?.id ?? "";

      const user =
        await userRepository
          .findById(
            actorUserId,
          );

      if (!user || !user.isActive) {
        throw new AppError(
          "Authentication required",
          401,
        );
      }

      const deviceBinding =
        typeof req.body
          ?.deviceBinding ===
        "string"
          ? req.body.deviceBinding
              .trim()
              .toLowerCase()
          : "";

      if (
        !/^[a-f0-9]{64}$/.test(
          deviceBinding,
        )
      ) {
        throw new AppError(
          "Device binding is invalid",
          400,
        );
      }

      const organizationId =
        user.organizationId
          ?.toString();

      const issued =
        await deviceEnrollmentTokenService
          .issue({
            createdBy:
              actorUserId,
            organizationId,
            deviceBinding,
            ttlMinutes: 5,
          });

      await auditLogService.record({
        actorUserId,
        actorRole:
          req.user?.role,
        category:
          "device_update",
        method: "POST",
        path:
          "/devices/enrollment-credentials/self",
        resourceType:
          "device_enrollment",
        statusCode: 201,
        success: true,
        metadata: {
          organizationId,
          deviceBinding,
          expiresAt:
            issued.expiresAt
              .toISOString(),
        },
      });

      res.setHeader(
        "Cache-Control",
        "no-store",
      );
      res.setHeader(
        "Pragma",
        "no-cache",
      );

      res.status(201).json({
        success: true,
        message:
          "Device enrollment bootstrap issued",
        data: {
          ...issued,
          deviceBinding,
        },
      });
    };
}

export const deviceEnrollmentTokenController =
  new DeviceEnrollmentTokenController();
