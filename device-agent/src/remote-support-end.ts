import {
  getDeviceAuthHeaders,
} from "./device-auth.js";
import axios from "axios";

import {
  config,
} from "./config.js";

export async function endRemoteSupportFromEndpoint(
  input: {
    deviceId: string;
    sessionId: string;
    reason?: string;
  },
): Promise<void> {
  await axios.post(
    config.backendUrl +
      "/api/v1/devices/remote-sessions/" +
      encodeURIComponent(
        input.sessionId,
      ) +
      "/end",
    {
      deviceId:
        input.deviceId,

      reason:
        input.reason ??
        "Device user ended remote support session",
    },
    {
      headers: {
        "Content-Type":
          "application/json",

        ...(await getDeviceAuthHeaders(input.deviceId)),
      },

      timeout:
        10_000,
    },
  );
}

