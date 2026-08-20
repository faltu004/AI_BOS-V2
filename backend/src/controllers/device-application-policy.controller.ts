import type {
  RequestHandler,
} from "express";

import {
  deviceApplicationPolicyService,
} from "../services/device-application-policy.service.js";

import {
  AppError,
} from "../utils/app-error.js";

export class DeviceApplicationPolicyController {
  getAdminPolicy:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await deviceApplicationPolicyService
          .getPolicy(
            req.params.deviceId,
          );

      res.status(200).json({
        success: true,
        data: result,
      });
    };

  setPolicy:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      if (!req.user) {
        throw new AppError(
          "Authenticated user is required",
          401,
        );
      }

      const rule =
        await deviceApplicationPolicyService
          .setPolicy({
            deviceId:
              req.params.deviceId,

            processName:
              req.body?.processName,

            displayName:
              req.body?.displayName,

            action:
              req.body?.action,

            requestedBy:
              req.user.id,
          });

      res.status(200).json({
        success: true,
        message:
          "Application policy updated",
        data: rule,
      });
    };

  getAgentPolicy:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await deviceApplicationPolicyService
          .getAgentPolicy(
            req.query.deviceId,
          );

      res.status(200).json({
        success: true,
        data: result,
      });
    };

  reportAgentEnforcement:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await deviceApplicationPolicyService
          .reportAgentEnforcement({
            deviceId:
              req.body?.deviceId,
            status:
              req.body?.status,
            errorMessage:
              req.body?.errorMessage,
          });

      res.status(200).json({
        success: true,
        data: result,
      });
    };
}

export const deviceApplicationPolicyController =
  new DeviceApplicationPolicyController();
