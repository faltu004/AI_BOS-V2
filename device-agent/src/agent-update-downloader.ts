import axios from "axios";

import {
  createHash,
} from "node:crypto";

import {
  createReadStream,
  createWriteStream,
} from "node:fs";

import {
  lstat,
  mkdir,
  rename,
  rm,
} from "node:fs/promises";

import path from "node:path";

import {
  pipeline,
} from "node:stream/promises";

import {
  Transform,
} from "node:stream";

import type {
  AgentUpdateRelease,
} from "./agent-update-checker.js";

import {
  getUpdatePackagesRoot,
} from "./agent-update-paths.js";

import {
  getDeviceAuthHeaders,
} from "./device-auth.js";

import {
  config,
} from "./config.js";

export type DownloadedAgentUpdatePackage = {
  release: AgentUpdateRelease;
  filePath: string;
  verifiedSha256: string;
  reusedExisting: boolean;
};

const MAX_PACKAGE_BYTES =
  1024 * 1024 * 1024;

const stagingDirectory =
  getUpdatePackagesRoot();

async function calculateSha256(
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

export async function verifyAgentUpdatePackageFile(
  filePath: string,
  release: AgentUpdateRelease,
): Promise<string> {
  const info =
    await lstat(
      filePath,
    );

  if (
    !info.isFile() ||
    info.isSymbolicLink()
  ) {
    throw new Error(
      "Downloaded update package is not a regular file",
    );
  }

  if (
    info.size !==
    release.sizeBytes
  ) {
    throw new Error(
      "Downloaded update package size verification failed",
    );
  }

  const actualSha256 =
    await calculateSha256(
      filePath,
    );

  if (
    actualSha256 !==
    release.sha256
  ) {
    throw new Error(
      "Downloaded update package SHA256 verification failed",
    );
  }

  return actualSha256;
}

function resolvePackageUrl(
  packagePath: string,
): URL {
  const backend =
    new URL(
      config.backendUrl,
    );

  const packageUrl =
    new URL(
      packagePath,
      backend,
    );

  /*
   * Device credentials must never be sent
   * to another origin.
   */
  if (
    packageUrl.origin !==
    backend.origin
  ) {
    throw new Error(
      "Update package origin mismatch",
    );
  }

  return packageUrl;
}

export async function downloadAgentUpdatePackage(
  deviceId: string,
  release: AgentUpdateRelease,
): Promise<DownloadedAgentUpdatePackage> {
  if (
    !Number.isSafeInteger(
      release.sizeBytes,
    ) ||
    release.sizeBytes < 1 ||
    release.sizeBytes >
      MAX_PACKAGE_BYTES
  ) {
    throw new Error(
      "Update package size is outside allowed limits",
    );
  }

  await mkdir(
    stagingDirectory,
    {
      recursive: true,
    },
  );

  const finalPath =
    path.join(
      stagingDirectory,
      release.packageId +
        ".zip",
    );

  const partialPath =
    finalPath +
    ".partial";

  /*
   * Reuse only an already verified package.
   * Anything invalid is removed.
   */
  try {
    const verifiedSha256 =
      await verifyAgentUpdatePackageFile(
        finalPath,
        release,
      );

    return {
      release,
      filePath:
        finalPath,
      verifiedSha256,
      reusedExisting:
        true,
    };
  } catch {
    await rm(
      finalPath,
      {
        force: true,
      },
    );
  }

  await rm(
    partialPath,
    {
      force: true,
    },
  );

  const packageUrl =
    resolvePackageUrl(
      release.packagePath,
    );

  const response =
    await axios.get(
      packageUrl.toString(),
      {
        headers: {
          ...(await getDeviceAuthHeaders(
            deviceId,
          )),
        },

        responseType:
          "stream",

        timeout:
          60_000,

        /*
         * Never allow device credentials
         * to follow a redirect.
         */
        maxRedirects:
          0,

        validateStatus:
          (status) =>
            status === 200,
      },
    );

  const contentType =
    String(
      response.headers[
        "content-type"
      ] ?? "",
    )
      .toLowerCase();

  if (
    !contentType.startsWith(
      "application/zip",
    )
  ) {
    throw new Error(
      "Update package response has unexpected content type",
    );
  }

  const contentLengthHeader =
    response.headers[
      "content-length"
    ];

  if (
    contentLengthHeader !==
    undefined
  ) {
    const contentLength =
      Number(
        contentLengthHeader,
      );

    if (
      !Number.isSafeInteger(
        contentLength,
      ) ||
      contentLength !==
        release.sizeBytes
    ) {
      throw new Error(
        "Update package Content-Length verification failed",
      );
    }
  }

  let downloadedBytes =
    0;

  const byteLimiter =
    new Transform({
      transform(
        chunk,
        _encoding,
        callback,
      ) {
        const chunkSize =
          Buffer.isBuffer(
            chunk,
          )
            ? chunk.length
            : Buffer.byteLength(
                chunk,
              );

        downloadedBytes +=
          chunkSize;

        if (
          downloadedBytes >
            release.sizeBytes ||
          downloadedBytes >
            MAX_PACKAGE_BYTES
        ) {
          callback(
            new Error(
              "Update package exceeded allowed download size",
            ),
          );

          return;
        }

        callback(
          null,
          chunk,
        );
      },
    });

  try {
    await pipeline(
      response.data,
      byteLimiter,
      createWriteStream(
        partialPath,
        {
          flags:
            "wx",
        },
      ),
    );

    if (
      downloadedBytes !==
      release.sizeBytes
    ) {
      throw new Error(
        "Downloaded update package byte count mismatch",
      );
    }

    const verifiedSha256 =
      await verifyAgentUpdatePackageFile(
        partialPath,
        release,
      );

    /*
     * Same-directory rename gives us the
     * final verified package only after all
     * integrity checks have passed.
     */
    await rename(
      partialPath,
      finalPath,
    );

    const finalSha256 =
      await verifyAgentUpdatePackageFile(
        finalPath,
        release,
      );

    if (
      finalSha256 !==
      verifiedSha256
    ) {
      throw new Error(
        "Final staged package integrity verification failed",
      );
    }

    return {
      release,
      filePath:
        finalPath,
      verifiedSha256:
        finalSha256,
      reusedExisting:
        false,
    };
  } catch (error) {
    await rm(
      partialPath,
      {
        force: true,
      },
    );

    throw error;
  }
}
