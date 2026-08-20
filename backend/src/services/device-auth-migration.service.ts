import {
  migrationCompatibilityEnabled,
} from "../utils/secure-secret.js";

function configured(
  value: unknown,
): boolean {
  return (
    typeof value === "string" &&
    Boolean(
      value.trim(),
    )
  );
}

export type DeviceAuthMigrationStatus = {
  legacyDeviceAuthEnabled: boolean;

  legacyEnrollmentFallbackEnabled:
    boolean;

  dedicatedEnrollmentKeyConfigured:
    boolean;

  sharedServiceKeyConfigured:
    boolean;

  strictDeviceAuthConfigured:
    boolean;

  strictEnrollmentConfigured:
    boolean;

  strictConfigurationReady:
    boolean;

  deviceMigrationRuntimeVerified:
    false;
};

export class DeviceAuthMigrationService {
  getStatus():
    DeviceAuthMigrationStatus {
    const legacyDeviceAuthEnabled =
      migrationCompatibilityEnabled(
        process.env
          .ALLOW_LEGACY_DEVICE_AUTH,
      );

    const legacyEnrollmentFallbackEnabled =
      migrationCompatibilityEnabled(
        process.env
          .ALLOW_LEGACY_ENROLLMENT_FALLBACK,
      );

    const dedicatedEnrollmentKeyConfigured =
      configured(
        process.env
          .DEVICE_ENROLLMENT_KEY,
      );

    const sharedServiceKeyConfigured =
      configured(
        process.env
          .SERVICE_API_KEY,
      );

    const strictDeviceAuthConfigured =
      !legacyDeviceAuthEnabled;

    const strictEnrollmentConfigured =
      !legacyEnrollmentFallbackEnabled &&
      dedicatedEnrollmentKeyConfigured;

    const strictConfigurationReady =
      strictDeviceAuthConfigured &&
      strictEnrollmentConfigured;

    return {
      legacyDeviceAuthEnabled,

      legacyEnrollmentFallbackEnabled,

      dedicatedEnrollmentKeyConfigured,

      sharedServiceKeyConfigured,

      strictDeviceAuthConfigured,

      strictEnrollmentConfigured,

      strictConfigurationReady,

      /*
       * This deliberately remains false.
       *
       * Runtime device migration verification
       * is deferred until the dedicated test
       * phase. Configuration alone must never
       * claim that installed PCs were tested.
       */
      deviceMigrationRuntimeVerified:
        false,
    };
  }
}

export const deviceAuthMigrationService =
  new DeviceAuthMigrationService();
