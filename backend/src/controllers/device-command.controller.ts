import type {
  RequestHandler,
} from "express";

import {
  deviceCommandService,
} from "../services/device-command.service.js";

export class DeviceCommandController {
  createCommand:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        if (!req.user) {
          throw new Error(
            "Authenticated user is required",
          );
        }

        const command =
          await deviceCommandService
            .createCommand({
              deviceId:
                req.params.deviceId,

              type:
                req.body?.type,

              payload:
                req.body?.payload,

              requestedBy:
                req.user.id,

              requestedByRole:
                req.user.role,
            });

        res.status(201).json({
          success: true,
          message:
            "Device command queued",
          data:
            command,
        });
      };

  createPowerCommand:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        if (!req.user) {
          throw new Error(
            "Authenticated user is required",
          );
        }

        const command =
          await deviceCommandService
            .createPowerCommand({
              deviceId:
                req.params.deviceId,

              type:
                req.body?.type,

              payload:
                req.body?.payload,

              requestedBy:
                req.user.id,

              requestedByRole:
                req.user.role,
            });

        res.status(201).json({
          success: true,
          message:
            "Device power action queued",
          data:
            command,
        });
      };

  getNextCommand:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const command =
          await deviceCommandService
            .getNextCommand(
              req.query.deviceId,
            );

        res.status(200).json({
          success: true,
          data:
            command,
        });
      };

  updateStatus:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const command =
          await deviceCommandService
            .updateCommandStatus({
              deviceId:
                req.body?.deviceId,

              commandId:
                req.body?.commandId,

              status:
                req.body?.status,

              result:
                req.body?.result,

              errorMessage:
                req.body?.errorMessage,
            });

        res.status(200).json({
          success: true,
          message:
            "Command status updated",
          data:
            command,
        });
      };

  getDeviceCommands:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const commands =
          await deviceCommandService
            .getDeviceCommands(
              req.params.deviceId,
            );

        res.status(200).json({
          success: true,
          data: {
            deviceId:
              req.params.deviceId,

            commands,
          },
        });
      };
}

export const deviceCommandController =
  new DeviceCommandController();
