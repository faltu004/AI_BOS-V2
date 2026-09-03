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
  createdBy: string;
  organizationId?: string;
  deviceBinding?: string;
  expiresAt: Date;
};

export class DeviceEnrollmentTokenService {
  async issue(
    input: {
      createdBy: string;
      ttlMinutes?: unknown;
      organizationId?: string;
      deviceBinding?: string;
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

    const organizationId =
      clean(input.organizationId);

    const deviceBinding =
      clean(input.deviceBinding)
        .toLowerCase();

    if (
      deviceBinding &&
      !/^[a-f0-9]{64}$/.test(
        deviceBinding,
      )
    ) {
      throw new AppError(
        "Device binding is invalid",
        400,
      );
    }

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
        organizationId:
          organizationId ||
          undefined,
        deviceBinding:
          deviceBinding ||
          undefined,
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
      createdBy:
        token.createdBy,
      organizationId:
        token.organizationId,
      deviceBinding:
        token.deviceBinding,
      expiresAt:
        token.expiresAt,
    };
  }

  async claimForEnrollment(
    enrollmentKey: string,
    deviceBinding?: string,
  ): Promise<VerifiedDeviceEnrollmentToken | null> {
    const normalized =
      clean(enrollmentKey);

    if (
      !normalized.startsWith(
        ENROLLMENT_TOKEN_PREFIX,
      )
    ) {
      return null;
    }

    const normalizedBinding =
      clean(deviceBinding)
        .toLowerCase();

    if (
      normalizedBinding &&
      !/^[a-f0-9]{64}$/.test(
        normalizedBinding,
      )
    ) {
      return null;
    }

    const token =
      await deviceEnrollmentTokenRepository
        .consumeByHash(
          hashToken(normalized),
          new Date(),
          normalizedBinding ||
            undefined,
        );

    if (!token) {
      return null;
    }

    return {
      tokenHash:
        hashToken(normalized),
      createdBy:
        token.createdBy,
      organizationId:
        token.organizationId,
      deviceBinding:
        token.deviceBinding,
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
