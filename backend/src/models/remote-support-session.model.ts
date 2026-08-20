import {
  model,
  Schema,
  type HydratedDocument,
} from "mongoose";

export const remoteSessionStatuses = [
  "pending_consent",
  "declined",
  "ready",
  "active",
  "ended",
  "expired",
] as const;

export type RemoteSessionStatus =
  (typeof remoteSessionStatuses)[number];

export type RemoteSupportSession = {
  sessionId: string;
  deviceId: string;

  requestedBy: string;
  requestedByRole: string;

  status: RemoteSessionStatus;

  viewerTokenHash: string;
  endpointTokenHash?: string;

  requestedAt: Date;
  consentedAt?: Date;
  declinedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;

  expiresAt: Date;
  lastActivityAt?: Date;

  endReason?: string;

  capabilities: {
    screenView: boolean;
    remoteControl: boolean;
    recording: boolean;
  };
};

export type RemoteSupportSessionDocument =
  HydratedDocument<RemoteSupportSession>;

const remoteSupportSessionSchema =
  new Schema<RemoteSupportSession>(
    {
      sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      deviceId: {
        type: String,
        required: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      requestedBy: {
        type: String,
        required: true,
        index: true,
        maxlength: 200,
      },

      requestedByRole: {
        type: String,
        required: true,
        maxlength: 100,
      },

      status: {
        type: String,
        required: true,
        enum: remoteSessionStatuses,
        default: "pending_consent",
        index: true,
      },

      viewerTokenHash: {
        type: String,
        required: true,
        maxlength: 128,
      },

      endpointTokenHash: {
        type: String,
        maxlength: 128,
      },

      requestedAt: {
        type: Date,
        required: true,
      },

      consentedAt: {
        type: Date,
      },

      declinedAt: {
        type: Date,
      },

      startedAt: {
        type: Date,
      },

      endedAt: {
        type: Date,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true,
      },

      lastActivityAt: {
        type: Date,
      },

      endReason: {
        type: String,
        maxlength: 500,
      },

      capabilities: {
        screenView: {
          type: Boolean,
          required: true,
          default: true,
        },

        remoteControl: {
          type: Boolean,
          required: true,
          default: true,
        },

        recording: {
          type: Boolean,
          required: true,
          default: false,
        },
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

remoteSupportSessionSchema.index({
  deviceId: 1,
  status: 1,
  requestedAt: -1,
});

export const RemoteSupportSessionModel =
  model(
    "RemoteSupportSession",
    remoteSupportSessionSchema,
  );
