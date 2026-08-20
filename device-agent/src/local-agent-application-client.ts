import axios from "axios";

import {
  getLocalAgentBaseUrl,
} from "./local-agent-endpoint.js";

import type {
  ApplicationSnapshotPayload,
} from "./application-reporter.js";

import type {
  ApplicationSessionPayload,
} from "./application-session-reporter.js";

const localAgentBaseUrl = getLocalAgentBaseUrl();

export function createLocalAgentApplicationClient() {
  return {
    async publishSnapshot(
      payload: ApplicationSnapshotPayload,
    ): Promise<void> {
      await axios.post(
        localAgentBaseUrl + "/applications/snapshot",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 45_000,
        },
      );
    },

    async publishSession(
      payload: ApplicationSessionPayload,
    ): Promise<void> {
      await axios.post(
        localAgentBaseUrl + "/applications/session",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15_000,
        },
      );
    },

    async fetchPolicy(): Promise<unknown> {
      const response = await axios.get(
        localAgentBaseUrl + "/application-policy",
        {
          timeout: 10_000,
        },
      );

      return response.data?.data;
    },

    async reportPolicyStatus(
      status: "applied" | "failed",
      errorMessage?: string,
    ): Promise<void> {
      await axios.post(
        localAgentBaseUrl + "/application-policy/status",
        {
          status,
          errorMessage,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10_000,
        },
      );
    },
  };
}
