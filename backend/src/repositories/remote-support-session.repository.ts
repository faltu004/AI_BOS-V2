import {
  RemoteSupportSessionModel,
  type RemoteSessionStatus,
} from "../models/remote-support-session.model.js";

export type CreateRemoteSessionRecord = {
  sessionId: string;
  deviceId: string;

  requestedBy: string;
  requestedByRole: string;

  viewerTokenHash: string;

  requestedAt: Date;
  expiresAt: Date;
};

export class RemoteSupportSessionRepository {
  async create(
    input: CreateRemoteSessionRecord,
  ) {
    return RemoteSupportSessionModel
      .create({
        ...input,

        status:
          "pending_consent",

        capabilities: {
          screenView:
            true,

          remoteControl:
            true,

          recording:
            false,
        },
      });
  }

  async findBySessionId(
    sessionId: string,
  ) {
    return RemoteSupportSessionModel
      .findOne({
        sessionId,
      });
  }

  async findByDeviceAndSessionId(
    deviceId: string,
    sessionId: string,
  ) {
    return RemoteSupportSessionModel
      .findOne({
        deviceId,
        sessionId,
      });
  }

  async findLatestByDeviceId(
    deviceId: string,
  ) {
    return RemoteSupportSessionModel
      .findOne({
        deviceId,
      })
      .sort({
        requestedAt: -1,
      })
      .lean();
  }

  async findPendingByDeviceId(
    deviceId: string,
  ) {
    return RemoteSupportSessionModel
      .find({
        deviceId,

        status:
          "pending_consent",

        expiresAt: {
          $gt:
            new Date(),
        },
      })
      .sort({
        requestedAt:
          1,
      })
      .lean();
  }

  async expireStaleSessions(
    deviceId?: string,
  ) {
    const filter:
      Record<string, unknown> = {
        status: {
          $in: [
            "pending_consent",
            "ready",
          ],
        },

        expiresAt: {
          $lte:
            new Date(),
        },
      };

    if (deviceId) {
      filter.deviceId =
        deviceId;
    }

    return RemoteSupportSessionModel
      .updateMany(
        filter,
        {
          $set: {
            status:
              "expired",

            endedAt:
              new Date(),

            endReason:
              "Remote support request expired",
          },
        },
      );
  }

  async activateIfReady(
    sessionId: string,
    expiresAt: Date,
  ) {
    return RemoteSupportSessionModel
      .findOneAndUpdate(
        {
          sessionId,
          status: "ready",
          expiresAt: {
            $gt: new Date(),
          },
        },
        {
          $set: {
            status: "active",
            startedAt: new Date(),
            lastActivityAt: new Date(),
            expiresAt,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
  }

  async rotateViewerToken(
    input: {
      sessionId: string;
      deviceId: string;
      requestedBy: string;
      viewerTokenHash: string;
    },
  ) {
    return RemoteSupportSessionModel
      .findOneAndUpdate(
        {
          sessionId:
            input.sessionId,

          deviceId:
            input.deviceId,

          requestedBy:
            input.requestedBy,

          status: {
            $in: [
              "ready",
              "active",
            ],
          },

          expiresAt: {
            $gt:
              new Date(),
          },
        },
        {
          $set: {
            viewerTokenHash:
              input.viewerTokenHash,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
  }

  async updateStatus(
    sessionId: string,
    status: RemoteSessionStatus,
    update:
      Record<string, unknown>,
  ) {
    return RemoteSupportSessionModel
      .findOneAndUpdate(
        {
          sessionId,
        },
        {
          $set: {
            status,
            ...update,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
  }
}

export const remoteSupportSessionRepository =
  new RemoteSupportSessionRepository();

