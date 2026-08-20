import axios from "axios";

import {
  getLocalAgentBaseUrl,
} from "./local-agent-endpoint.js";

import type {
  RemoteSupportConsentApi,
} from "./remote-support-consent.js";

export function createLocalRemoteSupportConsentApi():
  RemoteSupportConsentApi {
  const baseUrl =
    getLocalAgentBaseUrl();

  return {
    getPending:
      async () => {
        const response =
          await axios.get(
            baseUrl +
              "/remote-support/pending",
            {
              timeout:
                10_000,
            },
          );

        return response.data?.data;
      },

    submitDecision:
      async (
        sessionId,
        decision,
      ) => {
        const response =
          await axios.post(
            baseUrl +
              "/remote-support/" +
              encodeURIComponent(
                sessionId,
              ) +
              "/consent",
            {
              decision,
            },
            {
              headers: {
                "Content-Type":
                  "application/json",
              },

              timeout:
                10_000,
            },
          );

        return response.data?.data;
      },
  };
}

export async function endRemoteSupportViaLocalAgent(
  input: {
    sessionId: string;
    reason?: string;
  },
): Promise<void> {
  await axios.post(
    getLocalAgentBaseUrl() +
      "/remote-support/" +
      encodeURIComponent(
        input.sessionId,
      ) +
      "/end",
    {
      reason:
        input.reason ??
        "Device user ended remote support session",
    },
    {
      headers: {
        "Content-Type":
          "application/json",
      },

      timeout:
        10_000,
    },
  );
}
