import {
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";

import {
  AppError,
} from "../utils/app-error.js";

import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

import {
  remoteSupportSessionRepository,
} from "../repositories/remote-support-session.repository.js";

const REQUEST_TTL_MS =
  5 * 60 * 1000;

const READY_TTL_MS =
  2 * 60 * 1000;

function normalizeRequiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      field + " is required",
      400,
    );
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        maxLength,
      );

  if (!normalized) {
    throw new AppError(
      field + " is required",
      400,
    );
  }

  return normalized;
}

function createParticipantToken():
  string {
  return randomBytes(
    32,
  ).toString(
    "base64url",
  );
}

function hashToken(
  token: string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      token,
      "utf8",
    )
    .digest(
      "hex",
    );
}

function publicSession(
  session: {
    sessionId: string;
    deviceId: string;

    requestedBy: string;
    requestedByRole: string;

    status: string;

    requestedAt: Date;
    consentedAt?: Date;
    declinedAt?: Date;
    startedAt?: Date;
    endedAt?: Date;

    expiresAt: Date;

    endReason?: string;

    capabilities: {
      screenView: boolean;
      remoteControl: boolean;
      recording: boolean;
    };
  },
) {
  return {
    sessionId:
      session.sessionId,

    deviceId:
      session.deviceId,

    requestedBy:
      session.requestedBy,

    requestedByRole:
      session.requestedByRole,

    status:
      session.status,

    requestedAt:
      session.requestedAt,

    consentedAt:
      session.consentedAt,

    declinedAt:
      session.declinedAt,

    startedAt:
      session.startedAt,

    endedAt:
      session.endedAt,

    expiresAt:
      session.expiresAt,

    endReason:
      session.endReason,

    capabilities:
      session.capabilities,
  };
}

export class RemoteSupportSessionService {
  async createSession(
    input: {
      deviceId?: unknown;
      requestedBy?: unknown;
      requestedByRole?: unknown;
    },
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        "Device ID",
        100,
      );

    const requestedBy =
      normalizeRequiredString(
        input.requestedBy,
        "Requested by",
        200,
      );

    const requestedByRole =
      normalizeRequiredString(
        input.requestedByRole,
        "Requested by role",
        100,
      );

    const device =
      await managedDeviceRepository
        .findByDeviceId(
          deviceId,
        );

    if (!device) {
      throw new AppError(
        "Managed device not found",
        404,
      );
    }

    if (
      device.status ===
      "disabled"
    ) {
      throw new AppError(
        "Remote support cannot be requested for a disabled device",
        409,
      );
    }

    await remoteSupportSessionRepository
      .expireStaleSessions(
        deviceId,
      );

    const viewerToken =
      createParticipantToken();

    const requestedAt =
      new Date();

    const expiresAt =
      new Date(
        requestedAt.getTime() +
          REQUEST_TTL_MS,
      );

    const session =
      await remoteSupportSessionRepository
        .create({
          sessionId:
            "RMS-" +
            randomUUID(),

          deviceId,

          requestedBy,
          requestedByRole,

          viewerTokenHash:
            hashToken(
              viewerToken,
            ),

          requestedAt,
          expiresAt,
        });

    return {
      session:
        publicSession(
          session,
        ),

      viewerToken,
    };
  }

  async getAdminSession(
    deviceIdInput: unknown,
    sessionIdInput: unknown,
  ) {
    const deviceId =
      normalizeRequiredString(
        deviceIdInput,
        "Device ID",
        100,
      );

    const sessionId =
      normalizeRequiredString(
        sessionIdInput,
        "Session ID",
        100,
      );

    await remoteSupportSessionRepository
      .expireStaleSessions(
        deviceId,
      );

    const session =
      await remoteSupportSessionRepository
        .findByDeviceAndSessionId(
          deviceId,
          sessionId,
        );

    if (!session) {
      throw new AppError(
        "Remote support session not found",
        404,
      );
    }

    return publicSession(
      session,
    );
  }

  async getCurrentAdminSession(
    deviceIdInput: unknown,
  ) {
    const deviceId = normalizeRequiredString(
      deviceIdInput,
      "Device ID",
      100,
    );

    await remoteSupportSessionRepository.expireStaleSessions(deviceId);

    const session = await remoteSupportSessionRepository.findLatestByDeviceId(
      deviceId,
    );

    return session ? publicSession(session) : null;
  }

  async issueViewerToken(
    input: {
      deviceId?: unknown;
      sessionId?: unknown;
      requestedBy?: unknown;
    },
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        "Device ID",
        100,
      );

    const sessionId =
      normalizeRequiredString(
        input.sessionId,
        "Session ID",
        100,
      );

    const requestedBy =
      normalizeRequiredString(
        input.requestedBy,
        "Requested by",
        200,
      );

    await remoteSupportSessionRepository
      .expireStaleSessions(
        deviceId,
      );

    const viewerToken =
      createParticipantToken();

    const session =
      await remoteSupportSessionRepository
        .rotateViewerToken({
          deviceId,
          sessionId,
          requestedBy,
          viewerTokenHash:
            hashToken(
              viewerToken,
            ),
        });

    if (!session) {
      throw new AppError(
        "Remote support viewer credential is unavailable",
        409,
      );
    }

    return {
      session:
        publicSession(
          session,
        ),

      viewerToken,
    };
  }

  async getPendingForAgent(
    deviceIdInput: unknown,
  ) {
    const deviceId =
      normalizeRequiredString(
        deviceIdInput,
        "Device ID",
        100,
      );

    const device =
      await managedDeviceRepository
        .findByDeviceId(
          deviceId,
        );

    if (!device) {
      throw new AppError(
        "Managed device not found",
        404,
      );
    }

    await remoteSupportSessionRepository
      .expireStaleSessions(
        deviceId,
      );

    const sessions =
      await remoteSupportSessionRepository
        .findPendingByDeviceId(
          deviceId,
        );

    return {
      deviceId,

      requests:
        sessions.map(
          (session) => ({
            sessionId:
              session.sessionId,

            requestedBy:
              session.requestedBy,

            requestedByRole:
              session.requestedByRole,

            requestedAt:
              session.requestedAt,

            expiresAt:
              session.expiresAt,

            capabilities:
              session.capabilities,
          }),
        ),
    };
  }

  async respondToConsent(
    input: {
      deviceId?: unknown;
      sessionId?: unknown;
      decision?: unknown;
    },
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        "Device ID",
        100,
      );

    const sessionId =
      normalizeRequiredString(
        input.sessionId,
        "Session ID",
        100,
      );

    if (
      input.decision !==
        "allow" &&
      input.decision !==
        "decline"
    ) {
      throw new AppError(
        "Consent decision must be allow or decline",
        400,
      );
    }

    await remoteSupportSessionRepository
      .expireStaleSessions(
        deviceId,
      );

    const session =
      await remoteSupportSessionRepository
        .findByDeviceAndSessionId(
          deviceId,
          sessionId,
        );

    if (!session) {
      throw new AppError(
        "Remote support session not found",
        404,
      );
    }

    if (
      session.status ===
      "expired"
    ) {
      throw new AppError(
        "Remote support request has expired",
        410,
      );
    }

    if (
      input.decision ===
      "decline"
    ) {
      if (
        session.status !==
        "pending_consent"
      ) {
        throw new AppError(
          "Remote support request is no longer awaiting consent",
          409,
        );
      }

      const updated =
        await remoteSupportSessionRepository
          .updateStatus(
            sessionId,
            "declined",
            {
              declinedAt:
                new Date(),

              endedAt:
                new Date(),

              endReason:
                "User declined remote support request",
            },
          );

      if (!updated) {
        throw new AppError(
          "Remote support session not found",
          404,
        );
      }

      return {
        session:
          publicSession(
            updated,
          ),

        endpointToken:
          null,
      };
    }

    if (
      session.status !==
        "pending_consent" &&
      session.status !==
        "ready"
    ) {
      throw new AppError(
        "Remote support request cannot be approved in its current state",
        409,
      );
    }

    const endpointToken =
      createParticipantToken();

    const consentedAt =
      session.consentedAt ??
      new Date();

    const expiresAt =
      new Date(
        Date.now() +
          READY_TTL_MS,
      );

    const updated =
      await remoteSupportSessionRepository
        .updateStatus(
          sessionId,
          "ready",
          {
            endpointTokenHash:
              hashToken(
                endpointToken,
              ),

            consentedAt,
            expiresAt,
          },
        );

    if (!updated) {
      throw new AppError(
        "Remote support session not found",
        404,
      );
    }

    return {
      session:
        publicSession(
          updated,
        ),

      endpointToken,
    };
  }

  async endSession(
    input: {
      deviceId?: unknown;
      sessionId?: unknown;
      reason?: unknown;
    },
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        "Device ID",
        100,
      );

    const sessionId =
      normalizeRequiredString(
        input.sessionId,
        "Session ID",
        100,
      );

    const session =
      await remoteSupportSessionRepository
        .findByDeviceAndSessionId(
          deviceId,
          sessionId,
        );

    if (!session) {
      throw new AppError(
        "Remote support session not found",
        404,
      );
    }

    if (
      session.status ===
        "ended" ||
      session.status ===
        "declined" ||
      session.status ===
        "expired"
    ) {
      return publicSession(
        session,
      );
    }

    const reason =
      typeof input.reason ===
        "string"
        ? input.reason
            .trim()
            .slice(
              0,
              500,
            )
        : "";

    const updated =
      await remoteSupportSessionRepository
        .updateStatus(
          sessionId,
          "ended",
          {
            endedAt:
              new Date(),

            endReason:
              reason ||
              "Remote support session ended",
          },
        );

    if (!updated) {
      throw new AppError(
        "Remote support session not found",
        404,
      );
    }

    return publicSession(
      updated,
    );
  }
}

export const remoteSupportSessionService =
  new RemoteSupportSessionService();
