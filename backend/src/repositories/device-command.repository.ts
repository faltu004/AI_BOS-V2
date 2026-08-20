import {
  DeviceCommandModel,
} from "../models/device-command.model.js";

export type DeviceCommandType =
  | "PING"
  | "INSTALL_APP"
  | "UNINSTALL_APP"
  | "UPDATE_APP"
  | "RESTART_DEVICE"
  | "SHUTDOWN_DEVICE";

export type DeviceCommandStatus =
  | "queued"
  | "sent"
  | "acknowledged"
  | "running"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export type CreateDeviceCommandRecord = {
  commandId: string;
  deviceId: string;
  type: DeviceCommandType;
  payload?: unknown;
  requestedBy?: string | null;
  requestedByRole?: string | null;
  authorizationPermission?: string | null;
  requestedAt: Date;
  expiresAt?: Date | null;
};

export class DeviceCommandRepository {
  async create(
    input: CreateDeviceCommandRecord,
  ) {
    return DeviceCommandModel
      .create({
        ...input,
        status: "queued",
      });
  }

  async findByCommandId(
    commandId: string,
  ) {
    return DeviceCommandModel
      .findOne({
        commandId,
      })
      .lean();
  }

  async findRecentByDeviceId(
    deviceId: string,
    limit = 100,
  ) {
    return DeviceCommandModel
      .find({
        deviceId,
      })
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  }

  async expirePendingCommands(
    deviceId: string,
    now: Date,
  ) {
    return DeviceCommandModel
      .updateMany(
        {
          deviceId,

          status: {
            $in: [
              "queued",
              "sent",
              "acknowledged",
            ],
          },

          expiresAt: {
            $ne: null,
            $lte: now,
          },
        },
        {
          $set: {
            status: "expired",
            completedAt: now,
            errorMessage:
              "Command expired before execution",
          },
        },
      );
  }

  async failStaleDeliveryCommands(
    deviceId: string,
    staleBefore: Date,
    now: Date,
    maxAttempts: number,
  ) {
    return DeviceCommandModel
      .updateMany(
        {
          deviceId,

          status: {
            $in: [
              "sent",
              "acknowledged",
            ],
          },

          sentAt: {
            $ne: null,
            $lte: staleBefore,
          },

          attemptCount: {
            $gte: maxAttempts,
          },
        },
        {
          $set: {
            status: "failed",
            completedAt: now,
            errorMessage:
              "Command delivery failed after maximum retry attempts",
          },
        },
      );
  }

  async requeueStaleDeliveryCommands(
    deviceId: string,
    staleBefore: Date,
    now: Date,
    maxAttempts: number,
  ) {
    return DeviceCommandModel
      .updateMany(
        {
          deviceId,

          status: {
            $in: [
              "sent",
              "acknowledged",
            ],
          },

          sentAt: {
            $ne: null,
            $lte: staleBefore,
          },

          attemptCount: {
            $lt: maxAttempts,
          },

          $or: [
            {
              expiresAt: null,
            },
            {
              expiresAt: {
                $gt: now,
              },
            },
          ],
        },
        {
          $set: {
            status: "queued",
            sentAt: null,
            acknowledgedAt: null,
            startedAt: null,
            completedAt: null,
            result: null,
            errorMessage: null,
          },
        },
      );
  }

  async claimNextQueuedCommand(
    deviceId: string,
    now: Date,
    maxAttempts = 3,
  ) {
    return DeviceCommandModel
      .findOneAndUpdate(
        {
          deviceId,
          status: "queued",

          attemptCount: {
            $lt: maxAttempts,
          },

          $or: [
            {
              expiresAt: null,
            },
            {
              expiresAt: {
                $gt: now,
              },
            },
          ],
        },
        {
          $set: {
            status: "sent",
            sentAt: now,
            acknowledgedAt: null,
            startedAt: null,
            completedAt: null,
            result: null,
            errorMessage: null,
          },

          $inc: {
            attemptCount: 1,
          },
        },
        {
          new: true,

          sort: {
            requestedAt: 1,
          },
        },
      )
      .lean();
  }

  async updateStatus(
    commandId: string,
    deviceId: string,
    update: {
      status: DeviceCommandStatus;
      acknowledgedAt?: Date | null;
      startedAt?: Date | null;
      completedAt?: Date | null;
      result?: unknown;
      errorMessage?: string | null;
    },
  ) {
    return DeviceCommandModel
      .findOneAndUpdate(
        {
          commandId,
          deviceId,
        },
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .lean();
  }
}

export const deviceCommandRepository =
  new DeviceCommandRepository();

