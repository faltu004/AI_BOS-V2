import {
  createReadStream,
  createWriteStream,
} from "node:fs";

import {
  lstat,
  mkdir,
  readFile,
  rm,
} from "node:fs/promises";

import path from "node:path";

import {
  Transform,
} from "node:stream";

import {
  pipeline,
} from "node:stream/promises";

import {
  Parse,
  type Entry,
} from "unzipper";

import type {
  AgentUpdateRelease,
} from "./agent-update-checker.js";

import {
  verifyAgentUpdatePackageFile,
  type DownloadedAgentUpdatePackage,
} from "./agent-update-downloader.js";

import {
  getUpdateExtractedRoot,
} from "./agent-update-paths.js";

export type StagedAgentUpdatePackage = {
  release: AgentUpdateRelease;
  packageFilePath: string;
  stageRoot: string;
  entryCount: number;
  totalUncompressedBytes: number;
};

const MAX_ENTRY_COUNT =
  20_000;

const MAX_FILE_BYTES =
  1024 * 1024 * 1024;

const MAX_TOTAL_UNCOMPRESSED_BYTES =
  2 * 1024 * 1024 * 1024;

const allowedTopLevels =
  new Set([
    "agent",
    "runtime",
    "service",
  ]);

const extractedRoot =
  getUpdateExtractedRoot();

function isWindowsReservedName(
  value: string,
): boolean {
  const base =
    value
      .split(".")[0]
      ?.toUpperCase() ??
    "";

  return (
    base === "CON" ||
    base === "PRN" ||
    base === "AUX" ||
    base === "NUL" ||
    /^COM[1-9]$/.test(base) ||
    /^LPT[1-9]$/.test(base)
  );
}

function normalizeArchivePath(
  input: string,
): string {
  if (
    typeof input !== "string" ||
    input.length < 1 ||
    input.length > 1024 ||
    input.includes("\0")
  ) {
    throw new Error(
      "Update archive contains an invalid path",
    );
  }

  let value =
    input.replace(
      /\\/g,
      "/",
    );

  value =
    value.replace(
      /\/+$/,
      "",
    );

  if (
    value.length < 1 ||
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[A-Za-z]:/.test(value) ||
    value.includes("//")
  ) {
    throw new Error(
      "Update archive contains an absolute or malformed path",
    );
  }

  const parts =
    value.split("/");

  for (
    const part of parts
  ) {
    if (
      part.length < 1 ||
      part === "." ||
      part === ".."
    ) {
      throw new Error(
        "Update archive path traversal rejected",
      );
    }

    if (
      /[<>:"|?*]/.test(
        part,
      ) ||
      part.endsWith(".") ||
      part.endsWith(" ") ||
      isWindowsReservedName(
        part,
      )
    ) {
      throw new Error(
        "Update archive contains an unsafe Windows path",
      );
    }
  }

  const topLevel =
    parts[0]?.toLowerCase();

  if (
    !topLevel ||
    !allowedTopLevels.has(
      topLevel,
    )
  ) {
    throw new Error(
      "Update archive contains an unexpected top-level path",
    );
  }

  const fileName =
    parts[
      parts.length - 1
    ]?.toLowerCase() ?? "";

  if (
    fileName === ".env" ||
    fileName.startsWith(
      ".env.",
    ) ||
    fileName ===
      "credentials.json" ||
    fileName ===
      "secrets.json" ||
    fileName ===
      "device-token.txt" ||
    fileName ===
      "enrollment-key.txt"
  ) {
    throw new Error(
      "Sensitive file is not allowed in an agent update package",
    );
  }

  return parts.join("/");
}

function ensureInsideStageRoot(
  stageRoot: string,
  archivePath: string,
): string {
  const target =
    path.resolve(
      stageRoot,
      ...archivePath.split("/"),
    );

  const prefix =
    stageRoot +
    path.sep;

  if (
    target !== stageRoot &&
    !target.startsWith(
      prefix,
    )
  ) {
    throw new Error(
      "Update archive escaped the staging directory",
    );
  }

  return target;
}

function isSymlinkEntry(
  entry: Entry,
): boolean {
  const attributes =
    entry.vars
      .externalFileAttributes ??
    0;

  const unixMode =
    (
      attributes >>>
      16
    ) & 0xffff;

  const fileType =
    unixMode &
    0xf000;

  return fileType ===
    0xa000;
}

async function requireRegularFile(
  filePath: string,
  name: string,
): Promise<void> {
  const info =
    await lstat(
      filePath,
    );

  if (
    !info.isFile() ||
    info.isSymbolicLink()
  ) {
    throw new Error(
      name +
        " must be a regular file",
    );
  }
}

export async function validateStagedAgentUpdatePackage(
  stageRoot: string,
  release: AgentUpdateRelease,
): Promise<void> {
  const requiredFiles =
    [
      [
        "agent/package.json",
        "Agent package metadata",
      ],
      [
        "agent/dist/index.js",
        "Agent entry point",
      ],
      [
        "agent/dist/session-helper.js",
        "Session Helper entry point",
      ],
      [
        "runtime/node.exe",
        "Agent Node runtime",
      ],
      [
        "service/AIBOSDeviceAgent.exe",
        "Windows service wrapper",
      ],
      [
        "service/AIBOSDeviceAgent.xml",
        "Windows service configuration",
      ],
    ] as const;

  for (
    const [
      relativePath,
      name,
    ] of requiredFiles
  ) {
    await requireRegularFile(
      path.join(
        stageRoot,
        ...relativePath.split("/"),
      ),
      name,
    );
  }

  const envPath =
    path.join(
      stageRoot,
      "agent",
      ".env",
    );

  try {
    await lstat(
      envPath,
    );

    throw new Error(
      "Update package must not contain agent .env",
    );
  } catch (
    error
  ) {
    if (
      error instanceof Error &&
      "code" in error &&
      (
        error as
          NodeJS.ErrnoException
      ).code === "ENOENT"
    ) {
      // Expected.
    } else {
      throw error;
    }
  }

  const packageText =
    await readFile(
      path.join(
        stageRoot,
        "agent",
        "package.json",
      ),
      "utf8",
    );

  /*
   * UTF-8 JSON may contain an optional BOM.
   * Strip only that leading marker before
   * strict JSON parsing.
   */
  const normalizedPackageText =
    packageText.charCodeAt(0) ===
      0xfeff
      ? packageText.slice(1)
      : packageText;

  const metadata =
    JSON.parse(
      normalizedPackageText,
    ) as {
      name?: unknown;
      version?: unknown;
    };

  if (
    metadata.name !==
      "device-agent" ||
    metadata.version !==
      release.version
  ) {
    throw new Error(
      "Update package metadata does not match the approved release",
    );
  }
}

export async function stageAgentUpdatePackage(
  downloaded:
    DownloadedAgentUpdatePackage,
): Promise<StagedAgentUpdatePackage> {
  /*
   * Recheck the package immediately before
   * parsing/extraction. The downloader result
   * is not treated as permanently trusted.
   */
  await verifyAgentUpdatePackageFile(
    downloaded.filePath,
    downloaded.release,
  );

  await mkdir(
    extractedRoot,
    {
      recursive: true,
    },
  );

  const stageRoot =
    path.resolve(
      extractedRoot,
      downloaded.release
        .packageId +
        ".new",
    );

  const allowedPrefix =
    extractedRoot +
    path.sep;

  if (
    !stageRoot.startsWith(
      allowedPrefix,
    )
  ) {
    throw new Error(
      "Invalid update staging path",
    );
  }

  await rm(
    stageRoot,
    {
      recursive: true,
      force: true,
    },
  );

  await mkdir(
    stageRoot,
    {
      recursive: true,
    },
  );

  const seenPaths =
    new Set<string>();

  let entryCount =
    0;

  let totalUncompressedBytes =
    0;

  const archive =
    createReadStream(
      downloaded.filePath,
    ).pipe(
      Parse({
        forceStream: true,
      }),
    );

  try {
    for await (
      const entry of archive
    ) {
      entryCount +=
        1;

      if (
        entryCount >
        MAX_ENTRY_COUNT
      ) {
        entry.autodrain();

        throw new Error(
          "Update archive contains too many entries",
        );
      }

      if (
        isSymlinkEntry(
          entry,
        )
      ) {
        entry.autodrain();

        throw new Error(
          "Update archive symlink entry rejected",
        );
      }

      if (
        entry.type !== "File" &&
        entry.type !==
          "Directory"
      ) {
        entry.autodrain();

        throw new Error(
          "Unsupported update archive entry type",
        );
      }

      const archivePath =
        normalizeArchivePath(
          entry.path,
        );

      const pathKey =
        archivePath
          .toLowerCase();

      if (
        seenPaths.has(
          pathKey,
        )
      ) {
        entry.autodrain();

        throw new Error(
          "Duplicate update archive path rejected",
        );
      }

      seenPaths.add(
        pathKey,
      );

      const destination =
        ensureInsideStageRoot(
          stageRoot,
          archivePath,
        );

      if (
        entry.type ===
        "Directory"
      ) {
        await mkdir(
          destination,
          {
            recursive: true,
          },
        );

        entry.autodrain();

        continue;
      }

      const declaredSize =
        entry.vars
          .uncompressedSize;

      if (
        typeof declaredSize ===
          "number" &&
        (
          !Number.isSafeInteger(
            declaredSize,
          ) ||
          declaredSize < 0 ||
          declaredSize >
            MAX_FILE_BYTES
        )
      ) {
        entry.autodrain();

        throw new Error(
          "Update archive file size is invalid",
        );
      }

      await mkdir(
        path.dirname(
          destination,
        ),
        {
          recursive: true,
        },
      );

      let fileBytes =
        0;

      const limiter =
        new Transform({
          transform(
            chunk,
            _encoding,
            callback,
          ) {
            const size =
              Buffer.isBuffer(
                chunk,
              )
                ? chunk.length
                : Buffer.byteLength(
                    chunk,
                  );

            fileBytes +=
              size;

            totalUncompressedBytes +=
              size;

            if (
              fileBytes >
                MAX_FILE_BYTES ||
              totalUncompressedBytes >
                MAX_TOTAL_UNCOMPRESSED_BYTES
            ) {
              callback(
                new Error(
                  "Update archive exceeded extraction limits",
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

      await pipeline(
        entry,
        limiter,
        createWriteStream(
          destination,
          {
            flags: "wx",
          },
        ),
      );

      if (
        typeof declaredSize ===
          "number" &&
        declaredSize !==
          fileBytes
      ) {
        throw new Error(
          "Update archive file size mismatch",
        );
      }

      await requireRegularFile(
        destination,
        "Extracted update file",
      );
    }

    await validateStagedAgentUpdatePackage(
      stageRoot,
      downloaded.release,
    );

    return {
      release:
        downloaded.release,

      packageFilePath:
        downloaded.filePath,

      stageRoot,

      entryCount,

      totalUncompressedBytes,
    };
  } catch (
    error
  ) {
    await rm(
      stageRoot,
      {
        recursive: true,
        force: true,
      },
    );

    throw error;
  }
}

