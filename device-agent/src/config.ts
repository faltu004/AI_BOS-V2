import dotenv from "dotenv";
import { existsSync } from "node:fs";
import {
  legacyAgentEnvPath,
  protectedAgentEnvPath,
} from "./agent-storage.js";
import {
  configureNetworkAddressSelection,
} from "./network.js";

configureNetworkAddressSelection();

for (const envPath of [protectedAgentEnvPath, legacyAgentEnvPath]) {
  if (existsSync(envPath)) {
    dotenv.config({
      path: envPath,
      override: false,
    });
  }
}

const rawAgentMode =
  (
    process.env.AGENT_MODE ||
    "interactive"
  )
    .trim()
    .toLowerCase();

const agentMode:
  "interactive" |
  "service" =
    rawAgentMode === "service"
      ? "service"
      : "interactive";

const backendUrl =
  (
    process.env.BACKEND_URL ||
    "https://ADMIN-WORKNAI:5443"
  ).replace(/\/+$/, "");

export const config = {
  backendUrl,

  deviceName:
    process.env.DEVICE_NAME ||
    "AI-BOS-Agent",

  deviceToken:
    process.env.DEVICE_TOKEN ||
    "",

  heartbeatInterval:
    Number(
      process.env
        .HEARTBEAT_INTERVAL ||
        30000,
    ),

  agentMode,
};
