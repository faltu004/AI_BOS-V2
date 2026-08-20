import type {
  RequestHandler,
} from "express";

import {
  deviceApplicationSessionService,
} from "../services/device-application-session.service.js";

export class DeviceApplicationSessionController {
  saveSession:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const session =
          await deviceApplicationSessionService
            .saveSession(
              req.body,
            );

        res.status(200).json({
          success: true,
          message:
            "Application session received",
          data:
            session,
        });
      };

  getSessions:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const result =
          await deviceApplicationSessionService
            .getSessions(
              req.params.deviceId,
              req.query.range,
            );

        res.status(200).json({
          success: true,
          data:
            result,
        });
      };
}

export const deviceApplicationSessionController =
  new DeviceApplicationSessionController();
