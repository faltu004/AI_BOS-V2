import type {
  Request,
  RequestHandler,
} from "express";

import {
  deviceEnrollmentService,
} from "../services/device-enrollment.service.js";

import {
  auditLogService,
} from "../services/audit-log.service.js";

function getClientIp(
  req: Request,
): string {
  const forwardedFor =
    req.headers[
      "x-forwarded-for"
    ];

  if (
    typeof forwardedFor ===
    "string"
  ) {
    return (
      forwardedFor
        .split(",")[0]
        ?.trim() ||
      ""
    );
  }

  if (
    Array.isArray(
      forwardedFor,
    )
  ) {
    return (
      forwardedFor[0] ||
      ""
    );
  }

  return (
    req.ip ||
    req.socket
      .remoteAddress ||
    ""
  );
}

export class DeviceEnrollmentController {
  enroll:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const enrollmentCredential =
        res.locals
          .deviceEnrollmentCredential as
          | {
              type?: string;
              tokenHash?: string;
              createdBy?: string;
              organizationId?: string;
              deviceBinding?: string;
            }
          | undefined;

      const result =
        await deviceEnrollmentService
          .enroll({
            ...req.body,

            /*
             * Even if a caller submits
             * deviceId, the enrollment
             * service derives the final
             * identity server-side.
             */
            lastIp:
              getClientIp(
                req,
              ),
          }, {
            organizationId:
              enrollmentCredential
                ?.organizationId,
            deviceBinding:
              enrollmentCredential
                ?.deviceBinding,
          });

      if (
        enrollmentCredential
          ?.type ===
          "one-time"
      ) {
        await auditLogService.record({
          actorUserId:
            enrollmentCredential
              .createdBy,
          category:
            "device_update",
          method: "POST",
          path:
            "/devices/enroll",
          resourceType:
            "managed_device",
          resourceId:
            result.device
              .deviceId,
          statusCode: 201,
          success: true,
          ipAddress:
            getClientIp(req),
          metadata: {
            organizationId:
              enrollmentCredential
                .organizationId,
            deviceBinding:
              enrollmentCredential
                .deviceBinding,
            enrollmentType:
              "authenticated_one_time",
          },
        });
      }

      /*
       * Enrollment response contains the
       * raw credential exactly once.
       * Prevent HTTP/proxy caching.
       */
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
          "Device enrolled successfully",

        data: {
          device:
            result.device,

          credential: {
            deviceToken:
              result
                .credential
                .deviceToken,

            credentialVersion:
              result
                .credential
                .credentialVersion,

            issuedAt:
              result
                .credential
                .issuedAt,
          },
        },
      });
    };
}

export const deviceEnrollmentController =
  new DeviceEnrollmentController();
