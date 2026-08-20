import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  deviceEnrollmentTokenRepository,
} from "../repositories/device-enrollment-token.repository.js";

import {
  AppError,
} from "../utils/app-error.js";

const ENROLLMENT_TOKEN_PREFIX =
  "aibos_enroll_ot_";

const DEFAULT_TTL_MINUTES =
  15;

const MAX_TTL_MINUTES =
  60;

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function hashToken(
  token: string,
): string {
  return createHash("sha256")
    .update(
      token,
      "utf8",
    )
    .digest("hex");
}

function createEnrollmentToken():
  string {
  return (
    ENROLLMENT_TOKEN_PREFIX +
    randomBytes(32)
      .toString("base64url")
  );
}

function normalizeTtlMinutes(
  value: unknown,
): number {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return DEFAULT_TTL_MINUTES;
  }

  const ttl =
    Number(value);

  if (
    !Number.isInteger(ttl) ||
    ttl < 1 ||
    ttl > MAX_TTL_MINUTES
  ) {
    throw new AppError(
      "Enrollment credential TTL must be between 1 and 60 minutes",
      400,
    );
  }

  return ttl;
}

export type IssuedDeviceEnrollmentToken = {
  enrollmentKey: string;
  expiresAt: Date;
  ttlMinutes: number;
};

export type VerifiedDeviceEnrollmentToken = {
  tokenHash: string;
  expiresAt: Date;
};

export class DeviceEnrollmentTokenService {
  async issue(
    input: {
      createdBy: string;
      ttlMinutes?: unknown;
    },
  ): Promise<IssuedDeviceEnrollmentToken> {
    const createdBy =
      clean(
        input.createdBy,
      );

    if (!createdBy) {
      throw new AppError(
        "Authenticated admin user is required",
        401,
      );
    }

    const ttlMinutes =
      normalizeTtlMinutes(
        input.ttlMinutes,
      );

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          ttlMinutes *
            60 *
            1000,
      );

    const enrollmentKey =
      createEnrollmentToken();

    await deviceEnrollmentTokenRepository
      .create({
        tokenHash:
          hashToken(
            enrollmentKey,
          ),

        createdBy,
        createdAt:
          now,
        expiresAt,
      });

    return {
      enrollmentKey,
      expiresAt,
      ttlMinutes,
    };
  }

  async verify(
    enrollmentKey: string,
  ): Promise<VerifiedDeviceEnrollmentToken | null> {
    const normalized =
      clean(
        enrollmentKey,
      );

    if (
      !normalized.startsWith(
        ENROLLMENT_TOKEN_PREFIX,
      )
    ) {
      return null;
    }

    const tokenHash =
      hashToken(
        normalized,
      );

    const token =
      await deviceEnrollmentTokenRepository
        .findUsableByHash(
          tokenHash,
          new Date(),
        );

    if (!token) {
      return null;
    }

    return {
      tokenHash,
      expiresAt:
        token.expiresAt,
    };
  }

  async consume(
    tokenHash: string,
  ): Promise<void> {
    const consumed =
      await deviceEnrollmentTokenRepository
        .consumeByHash(
          tokenHash,
          new Date(),
        );

    if (!consumed) {
      throw new AppError(
        "Enrollment credential was already consumed or expired",
        409,
      );
    }
  }
}

export const deviceEnrollmentTokenService =
  new DeviceEnrollmentTokenService();
