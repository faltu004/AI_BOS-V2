import {
  createHash,
} from "node:crypto";

import {
  createReadStream,
} from "node:fs";

import {
  lstat,
} from "node:fs/promises";

import path from "node:path";

import {
  agentUpdateService,
  type AgentUpdateRelease,
} from "./agent-update.service.js";

export type VerifiedAgentUpdatePackage = {
  release: AgentUpdateRelease;
  filePath: string;
  verifiedSha256: string;
};

async function calculateFileSha256(
  filePath: string,
): Promise<string> {
  const hash =
    createHash(
      "sha256",
    );

  const stream =
    createReadStream(
      filePath,
    );

  for await (
    const chunk of stream
  ) {
    hash.update(
      chunk,
    );
  }

  return hash
    .digest("hex")
    .toUpperCase();
}

export class AgentUpdatePackageService {
  async verifyPackage(
    versionInput: unknown,
  ): Promise<
    VerifiedAgentUpdatePackage | null
  > {
    const release =
      agentUpdateService
        .findApprovedRelease(
          versionInput,
        );

    if (!release) {
      return null;
    }

    const configuredPath =
      process.env
        .AGENT_UPDATE_PACKAGE_FILE
        ?.trim();

    if (!configuredPath) {
      throw new Error(
        "Agent update package file is not configured",
      );
    }

    if (
      !path.isAbsolute(
        configuredPath,
      )
    ) {
      throw new Error(
        "Agent update package file must use an absolute server path",
      );
    }

    if (
      path.extname(
        configuredPath,
      ).toLowerCase() !==
      ".zip"
    ) {
      throw new Error(
        "Agent update package must be a ZIP file",
      );
    }

    const fileInfo =
      await lstat(
        configuredPath,
      );

    if (
      !fileInfo.isFile() ||
      fileInfo.isSymbolicLink()
    ) {
      throw new Error(
        "Agent update package must be a regular file",
      );
    }

    if (
      fileInfo.size !==
      release.sizeBytes
    ) {
      throw new Error(
        "Agent update package size verification failed",
      );
    }

    const actualSha256 =
      await calculateFileSha256(
        configuredPath,
      );

    if (
      actualSha256 !==
      release.sha256
    ) {
      throw new Error(
        "Agent update package SHA256 verification failed",
      );
    }

    return {
      release,
      filePath:
        configuredPath,
      verifiedSha256:
        actualSha256,
    };
  }
}

export const agentUpdatePackageService =
  new AgentUpdatePackageService();
