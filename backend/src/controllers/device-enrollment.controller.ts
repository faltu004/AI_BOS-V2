import type {
  Request,
  RequestHandler,
} from "express";

import {
  deviceEnrollmentService,
} from "../services/device-enrollment.service.js";

import {
  deviceEnrollmentTokenService,
} from "../services/device-enrollment-token.service.js";

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
          });

      const enrollmentCredential =
        res.locals
          .deviceEnrollmentCredential as
          | {
              type?: string;
              tokenHash?: string;
            }
          | undefined;

      if (
        enrollmentCredential
          ?.type ===
          "one-time" &&
        enrollmentCredential
          .tokenHash
      ) {
        await deviceEnrollmentTokenService
          .consume(
            enrollmentCredential
              .tokenHash,
          );
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
