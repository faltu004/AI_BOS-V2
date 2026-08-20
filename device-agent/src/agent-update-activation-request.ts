import {
  randomUUID,
} from "node:crypto";

import {
  lstat,
  mkdir,
  open,
  rename,
} from "node:fs/promises";

import path from "node:path";

import type {
  StagedAgentUpdatePackage,
} from "./agent-update-stager.js";

import {
  validateActivationRequest,
  type AgentActivationRequest,
} from "./agent-update-contract.js";

import {
  AGENT_UPDATE_SCHEMA_VERSION,
  getActivationRequestPath,
  getUpdateRequestsRoot,
} from "./agent-update-paths.js";

export type ActivationRequestResult =
  | {
      requested: false;
      reason: "disabled";
    }
  | {
      requested: true;
      request: AgentActivationRequest;
      requestPath: string;
    };

function activationEnabled():
  boolean {
  return (
    process.env
      .AI_BOS_AGENT_UPDATE_ACTIVATION_ENABLED
      ?.trim()
      .toLowerCase() === "true"
  );
}

async function atomicCreateJson(
  finalPath: string,
  data: unknown,
): Promise<void> {
  const tempPath =
    path.join(
      path.dirname(finalPath),
      "." +
        path.basename(finalPath) +
        "." +
        randomUUID() +
        ".partial",
    );

  const handle =
    await open(
      tempPath,
      "wx",
    );

  try {
    await handle.writeFile(
      JSON.stringify(
        data,
        null,
        2,
      ),
      "utf8",
    );

    await handle.sync();
  }
  finally {
    await handle.close();
  }

  try {
    await lstat(finalPath);

    throw new Error(
      "Activation request already exists",
    );
  } catch (
    error
  ) {
    if (
      error instanceof Error &&
      "code" in error &&
      (
        error as NodeJS.ErrnoException
      ).code === "ENOENT"
    ) {
      // Expected.
    } else {
      throw error;
    }
  }

  await rename(
    tempPath,
    finalPath,
  );
}

export async function createAgentUpdateActivationRequest(
  staged: StagedAgentUpdatePackage,
): Promise<ActivationRequestResult> {
  if (!activationEnabled()) {
    return {
      requested: false,
      reason: "disabled",
    };
  }

  await mkdir(
    getUpdateRequestsRoot(),
    {
      recursive: true,
    },
  );

  const request =
    validateActivationRequest({
      schemaVersion:
        AGENT_UPDATE_SCHEMA_VERSION,
      requestId:
        "upd_" +
        randomUUID()
          .replace(
            /-/g,
            "",
          ),
      packageId:
        staged.release.packageId,
      version:
        staged.release.version,
      sha256:
        staged.release.sha256,
      createdAt:
        new Date().toISOString(),
    });

  const requestPath =
    getActivationRequestPath();

  await atomicCreateJson(
    requestPath,
    request,
  );

  return {
    requested: true,
    request,
    requestPath,
  };
}
