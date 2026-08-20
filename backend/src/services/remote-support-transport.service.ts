import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import {
  AppError,
} from "../utils/app-error.js";

import {
  remoteSupportSessionRepository,
} from "../repositories/remote-support-session.repository.js";

export type RemoteTransportRole =
  | "viewer"
  | "endpoint";

const ACTIVE_SESSION_MS =
  60 * 60 * 1000;

function requiredString(
  value: unknown,
  name: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      name + " is required",
      400,
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      maxLength
  ) {
    throw new AppError(
      name + " is invalid",
      400,
    );
  }

  return normalized;
}

function hashToken(
  value: string,
): Buffer {
  return createHash(
    "sha256",
  )
    .update(
      value,
      "utf8",
    )
    .digest();
}

function tokenMatches(
  token: string,
  expectedHash:
    string |
    undefined,
): boolean {
  if (
    !expectedHash ||
    !/^[A-Fa-f0-9]{64}$/.test(
      expectedHash,
    )
  ) {
    return false;
  }

  const actual =
    hashToken(
      token,
    );

  const expected =
    Buffer.from(
      expectedHash,
      "hex",
    );

  if (
    actual.length !==
    expected.length
  ) {
    return false;
  }

  return timingSafeEqual(
    actual,
    expected,
  );
}

export class RemoteSupportTransportService {
  async requireUsableSession(
    sessionIdInput: unknown,
  ) {
    const sessionId =
      requiredString(
        sessionIdInput,
        "Session ID",
        100,
      );

    const session =
      await remoteSupportSessionRepository
        .findBySessionId(
          sessionId,
        );

    if (!session) {
      throw new AppError(
        "Remote support session not found",
        404,
      );
    }

    if (
      session.status !==
        "ready" &&
      session.status !==
        "active"
    ) {
      throw new AppError(
        "Remote support transport is not authorized",
        409,
      );
    }

    if (
      session.expiresAt
        .getTime() <=
      Date.now()
    ) {
      throw new AppError(
        "Remote support transport has expired",
        410,
      );
    }

    if (
      !session.capabilities
        .screenView
    ) {
      throw new AppError(
        "Screen viewing is not authorized for this session",
        403,
      );
    }

    return session;
  }

  async requireActiveSession(
    sessionIdInput: unknown,
  ) {
    const session =
      await this
        .requireUsableSession(
          sessionIdInput,
        );

    if (
      session.status !==
      "active"
    ) {
      throw new AppError(
        "Remote support session is not active",
        409,
      );
    }

    return session;
  }

  async authenticateParticipant(
    input: {
      sessionId?: unknown;
      role?: unknown;
      token?: unknown;
    },
  ) {
    const role =
      input.role;

    if (
      role !== "viewer" &&
      role !== "endpoint"
    ) {
      throw new AppError(
        "Remote participant role is invalid",
        400,
      );
    }

    const token =
      requiredString(
        input.token,
        "Participant token",
        500,
      );

    const session =
      await this
        .requireUsableSession(
          input.sessionId,
        );

    const expectedHash =
      role === "viewer"
        ? session.viewerTokenHash
        : session.endpointTokenHash;

    if (
      !tokenMatches(
        token,
        expectedHash,
      )
    ) {
      throw new AppError(
        "Invalid remote support participant token",
        401,
      );
    }

    return {
      sessionId:
        session.sessionId,

      deviceId:
        session.deviceId,

      requestedBy:
        session.requestedBy,

      requestedByRole:
        session.requestedByRole,

      role:
        role as
          RemoteTransportRole,

      capabilities:
        session.capabilities,
    };
  }

  async markActive(
    sessionIdInput: unknown,
  ) {
    const session =
      await this
        .requireUsableSession(
          sessionIdInput,
        );

    if (
      session.status ===
      "active"
    ) {
      return session;
    }

    const updated =
      await remoteSupportSessionRepository
        .activateIfReady(
          session.sessionId,

          new Date(
            Date.now() +
              ACTIVE_SESSION_MS,
          ),
        );

    if (updated) {
      return updated;
    }

    const latest =
      await remoteSupportSessionRepository
        .findBySessionId(
          session.sessionId,
        );

    if (
      latest?.status ===
      "active"
    ) {
      return latest;
    }

    throw new AppError(
      "Remote support session activation failed",
      409,
    );
  }
}

export const remoteSupportTransportService =
  new RemoteSupportTransportService();
