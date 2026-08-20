import type {
  RequestHandler,
} from "express";

import {
  deviceEnrollmentTokenService,
} from "../services/device-enrollment-token.service.js";

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
}

export const deviceEnrollmentTokenController =
  new DeviceEnrollmentTokenController();
