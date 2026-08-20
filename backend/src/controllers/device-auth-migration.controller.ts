import type {
  RequestHandler,
} from "express";

import {
  deviceAuthMigrationService,
} from "../services/device-auth-migration.service.js";

export class DeviceAuthMigrationController {
  getStatus:
    RequestHandler =
    async (
      _req,
      res,
    ) => {
      const status =
        deviceAuthMigrationService
          .getStatus();

      /*
       * Only boolean configuration metadata
       * is returned.
       *
       * No enrollment key, service key,
       * device token or credential hash is
       * ever exposed by this endpoint.
       */
      res.status(200).json({
        success: true,
        data: status,
      });
    };
}

export const deviceAuthMigrationController =
  new DeviceAuthMigrationController();
