import type {
  RequestHandler,
} from "express";

import {
  deviceAuditHistoryService,
} from "../services/device-audit-history.service.js";

export class DeviceAuditHistoryController {
  getHistory:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const history =
          await deviceAuditHistoryService
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

export const deviceAuditHistoryController =
  new DeviceAuditHistoryController();
