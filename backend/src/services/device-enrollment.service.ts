import type {
  RegisterManagedDeviceInput,
} from "./managed-device.service.js";

import {
  managedDeviceService,
} from "./managed-device.service.js";

import {
  deviceCredentialService,
} from "./device-credential.service.js";

import {
  AppError,
} from "../utils/app-error.js";

export type EnrollDeviceInput =
  RegisterManagedDeviceInput;

export class DeviceEnrollmentService {
  async enroll(
    input:
      EnrollDeviceInput,
    context?: {
      organizationId?: string;
      deviceBinding?: string;
    },
  ) {
    /*
     * managedDeviceService.enroll()
     * deliberately ignores any supplied
     * deviceId and derives identity on
     * the backend.
     */
    const device =
      await managedDeviceService
        .enroll(
          input,
        );

    const credential =
      await deviceCredentialService
        .issueInitialForDevice(
          device.deviceId,
          context,
        );

    if (!credential) {
      /*
       * Initial enrollment is intentionally create-only.
       *
       * A null result means another request won the unique deviceId insert,
       * or this physical device already has a credential. Rotating here would
       * invalidate the credential already returned to the winning Agent.
       * Replacement credentials are issued only through the separately
       * authorized request/prepare/confirm rotation workflow.
       */
      throw new AppError(
        "Device is already enrolled. Explicit authorized credential recovery is required.",
        409,
      );
    }

    return {
      device,
      credential,
    };
  }
}

export const deviceEnrollmentService =
  new DeviceEnrollmentService();
