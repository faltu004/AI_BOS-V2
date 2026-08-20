import {
  randomUUID,
} from "node:crypto";

import {
  mkdir,
  rename,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import {
  AGENT_VERSION,
} from "./agent-version.js";

import {
  AGENT_UPDATE_SCHEMA_VERSION,
  getAgentHealthMarkerPath,
  getAgentHealthRoot,
} from "./agent-update-paths.js";

export type AgentHealthMarker = {
  schemaVersion: number;
  version: string;
  status: "started";
  startedAt: string;
  pid: number;
};

export async function writeAgentHealthMarker():
  Promise<void> {
  const marker: AgentHealthMarker = {
    schemaVersion:
      AGENT_UPDATE_SCHEMA_VERSION,
    version:
      AGENT_VERSION,
    status:
      "started",
    startedAt:
      new Date().toISOString(),
    pid:
      process.pid,
  };

  const root =
    getAgentHealthRoot();

  await mkdir(
    root,
    {
      recursive: true,
    },
  );

  const finalPath =
    getAgentHealthMarkerPath();

  const tempPath =
    path.join(
      root,
      ".agent-health." +
        randomUUID() +
        ".tmp",
    );

  await writeFile(
    tempPath,
    JSON.stringify(
      marker,
      null,
      2,
    ),
    {
      encoding: "utf8",
      flag: "wx",
    },
  );

  await rename(
    tempPath,
    finalPath,
  );
}
