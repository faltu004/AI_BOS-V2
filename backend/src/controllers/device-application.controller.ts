import type {
  RequestHandler,
} from "express";

import {
  deviceApplicationService,
} from "../services/device-application.service.js";

export class DeviceApplicationController {
  saveSnapshot:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const snapshot =
          await deviceApplicationService
            .saveSnapshot(
              req.body,
            );

        res.status(200).json({
          success: true,
          message:
            "Application snapshot received",
          data: snapshot,
        });
      };

  getSnapshot:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const snapshot =
          await deviceApplicationService
            .getSnapshot(
              req.params.deviceId,
            );

        res.status(200).json({
          success: true,
          data: snapshot,
        });
      };
}

export const deviceApplicationController =
  new DeviceApplicationController();
