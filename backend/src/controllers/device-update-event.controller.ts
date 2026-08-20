import type {
  RequestHandler,
} from "express";

import {
  deviceUpdateEventService,
} from "../services/device-update-event.service.js";

export class DeviceUpdateEventController {
  recordStatus:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const event =
          await deviceUpdateEventService
            .recordStatus(
              req.body,
            );

        res.status(201).json({
          success: true,
          message:
            "Device update status recorded",
          data:
            event,
        });
      };

  getSummary:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const summary =
          await deviceUpdateEventService
            .getSummary(
              req.params.deviceId,
            );

        res.status(200).json({
          success: true,
          data:
            summary,
        });
      };

  getHistory:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const history =
          await deviceUpdateEventService
            .getHistory(
              req.params.deviceId,
            );

        res.status(200).json({
          success: true,
          data:
            history,
        });
      };
}

export const deviceUpdateEventController =
  new DeviceUpdateEventController();
