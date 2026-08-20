import type {
  RegisterManagedDeviceInput,
} from "./managed-device.service.js";

import {
  managedDeviceService,
} from "./managed-device.service.js";

import {
  deviceCredentialService,
} from "./device-credential.service.js";

export type EnrollDeviceInput =
  RegisterManagedDeviceInput;

export class DeviceEnrollmentService {
  async enroll(
    input:
      EnrollDeviceInput,
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

    let credential =
      await deviceCredentialService
        .issueInitialForDevice(
          device.deviceId,
        );

    if (!credential) {
      credential =
        await deviceCredentialService
          .issueForDevice(
            device.deviceId,
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
