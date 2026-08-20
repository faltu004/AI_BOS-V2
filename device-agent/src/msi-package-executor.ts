import {
  spawn,
} from "node:child_process";

import {
  createHash,
} from "node:crypto";

import {
  createReadStream,
  createWriteStream,
} from "node:fs";

import {
  mkdir,
  rm,
} from "node:fs/promises";

import * as https from "node:https";
import * as path from "node:path";

import {
  Transform,
} from "node:stream";

import {
  pipeline,
} from "node:stream/promises";

export type MsiPackagePayload = {
  packageId: string;

  name: string;
  version: string;
  publisher: string;

  packageType: "MSI";

  downloadUrl: string;
  sha256: string;
  productCode: string;
};

export type MsiPackageOperation =
  | "INSTALL_APP"
  | "UNINSTALL_APP"
  | "UPDATE_APP";

const maxDownloadBytes =
  1024 * 1024 * 1024;

const maxRedirects =
  5;

const installerTimeoutMs =
  45 * 60 * 1000;

function requireString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      field +
        " is required",
    );
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        maxLength,
      );

  if (!normalized) {
    throw new Error(
      field +
        " is required",
    );
  }

  return normalized;
}

function validatePackagePayload(
  input: unknown,
): MsiPackagePayload {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new Error(
      "Invalid MSI package payload",
    );
  }

  const value =
    input as
      Record<string, unknown>;

  const packageId =
    requireString(
      value.packageId,
      "Package ID",
      100,
    );

  const name =
    requireString(
      value.name,
      "Package name",
      200,
    );

  const version =
    requireString(
      value.version,
      "Package version",
      100,
    );

  const publisher =
    requireString(
      value.publisher,
      "Package publisher",
      200,
    );

  if (
    value.packageType !==
    "MSI"
  ) {
    throw new Error(
      "Only MSI packages are supported",
    );
  }

  const downloadUrl =
    requireString(
      value.downloadUrl,
      "Download URL",
      2048,
    );

  const parsedUrl =
    new URL(
      downloadUrl,
    );

  if (
    parsedUrl.protocol !==
    "https:"
  ) {
    throw new Error(
      "Package download must use HTTPS",
    );
  }

  if (
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error(
      "Package URL cannot contain credentials",
    );
  }

  const sha256 =
    requireString(
      value.sha256,
      "SHA256",
      64,
    ).toUpperCase();

  if (
    !/^[A-F0-9]{64}$/.test(
      sha256,
    )
  ) {
    throw new Error(
      "Invalid SHA256",
    );
  }

  const productCode =
    requireString(
      value.productCode,
      "MSI Product Code",
      64,
    ).toUpperCase();

  if (
    !/^\{[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\}$/.test(
      productCode,
    )
  ) {
    throw new Error(
      "Invalid MSI Product Code",
    );
  }

  return {
    packageId,
    name,
    version,
    publisher,
    packageType:
      "MSI",
    downloadUrl:
      parsedUrl.toString(),
    sha256,
    productCode,
  };
}

async function downloadHttpsFile(
  urlString: string,
  destinationPath: string,
  redirectCount = 0,
): Promise<number> {
  if (
    redirectCount >
    maxRedirects
  ) {
    throw new Error(
      "Too many package download redirects",
    );
  }

  const url =
    new URL(
      urlString,
    );

  if (
    url.protocol !==
    "https:"
  ) {
    throw new Error(
      "Package redirect must use HTTPS",
    );
  }

  return new Promise<number>(
    (
      resolve,
      reject,
    ) => {
      const request =
        https.get(
          url,
          {
            headers: {
              "User-Agent":
                "AI-BOS-Device-Agent",
            },
          },
          (
            response,
          ) => {
            const statusCode =
              response.statusCode ??
              0;

            if (
              statusCode >= 300 &&
              statusCode < 400
            ) {
              const location =
                response.headers
                  .location;

              response.resume();

              if (!location) {
                reject(
                  new Error(
                    "Package redirect has no location",
                  ),
                );

                return;
              }

              let nextUrl:
                URL;

              try {
                nextUrl =
                  new URL(
                    location,
                    url,
                  );
              } catch {
                reject(
                  new Error(
                    "Invalid package redirect URL",
                  ),
                );

                return;
              }

              if (
                nextUrl.protocol !==
                "https:"
              ) {
                reject(
                  new Error(
                    "Package redirect must remain HTTPS",
                  ),
                );

                return;
              }

              void downloadHttpsFile(
                nextUrl.toString(),
                destinationPath,
                redirectCount + 1,
              ).then(
                resolve,
                reject,
              );

              return;
            }

            if (
              statusCode !==
              200
            ) {
              response.resume();

              reject(
                new Error(
                  "Package download failed with HTTP " +
                    String(
                      statusCode,
                    ),
                ),
              );

              return;
            }

            const contentLengthValue =
              response.headers[
                "content-length"
              ];

            const contentLength =
              typeof contentLengthValue ===
              "string"
                ? Number(
                    contentLengthValue,
                  )
                : 0;

            if (
              Number.isFinite(
                contentLength,
              ) &&
              contentLength >
                maxDownloadBytes
            ) {
              response.resume();

              reject(
                new Error(
                  "Package exceeds maximum allowed size",
                ),
              );

              return;
            }

            let downloadedBytes =
              0;

            const limiter =
              new Transform({
                transform(
                  chunk,
                  _encoding,
                  callback,
                ) {
                  const buffer =
                    Buffer.isBuffer(
                      chunk,
                    )
                      ? chunk
                      : Buffer.from(
                          chunk,
                        );

                  downloadedBytes +=
                    buffer.length;

                  if (
                    downloadedBytes >
                    maxDownloadBytes
                  ) {
                    callback(
                      new Error(
                        "Package exceeds maximum allowed size",
                      ),
                    );

                    return;
                  }

                  callback(
                    null,
                    buffer,
                  );
                },
              });

            void pipeline(
              response,
              limiter,
              createWriteStream(
                destinationPath,
                {
                  flags: "w",
                },
              ),
            ).then(
              () => {
                resolve(
                  downloadedBytes,
                );
              },
              reject,
            );
          },
        );

      request.setTimeout(
        30_000,
        () => {
          request.destroy(
            new Error(
              "Package download connection timed out",
            ),
          );
        },
      );

      request.on(
        "error",
        reject,
      );
    },
  );
}

async function calculateSha256(
  filePath: string,
): Promise<string> {
  const hash =
    createHash(
      "sha256",
    );

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      const stream =
        createReadStream(
          filePath,
        );

      stream.on(
        "data",
        (
          chunk,
        ) => {
          hash.update(
            chunk,
          );
        },
      );

      stream.once(
        "error",
        reject,
      );

      stream.once(
        "end",
        resolve,
      );
    },
  );

  return hash
    .digest(
      "hex",
    )
    .toUpperCase();
}

function appendLimited(
  current: string,
  value: string,
): string {
  const combined =
    current +
    value;

  const maxLength =
    8_000;

  if (
    combined.length <=
    maxLength
  ) {
    return combined;
  }

  return combined.slice(
    -maxLength,
  );
}

async function runMsiexec(
  args: string[],
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const windowsRoot =
    process.env.WINDIR
      ?.trim() ||
    "C:\\Windows";

  const executable =
    path.join(
      windowsRoot,
      "System32",
      "msiexec.exe",
    );

  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const child =
        spawn(
          executable,
          args,
          {
            shell: false,
            windowsHide: true,

            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          },
        );

      let stdout =
        "";

      let stderr =
        "";

      let timedOut =
        false;

      child.stdout?.on(
        "data",
        (
          chunk,
        ) => {
          stdout =
            appendLimited(
              stdout,
              String(
                chunk,
              ),
            );
        },
      );

      child.stderr?.on(
        "data",
        (
          chunk,
        ) => {
          stderr =
            appendLimited(
              stderr,
              String(
                chunk,
              ),
            );
        },
      );

      const timeout =
        setTimeout(
          () => {
            timedOut =
              true;

            child.kill();
          },
          installerTimeoutMs,
        );

      child.once(
        "error",
        (
          error,
        ) => {
          clearTimeout(
            timeout,
          );

          reject(
            error,
          );
        },
      );

      child.once(
        "close",
        (
          code,
        ) => {
          clearTimeout(
            timeout,
          );

          if (timedOut) {
            reject(
              new Error(
                "MSI operation timed out",
              ),
            );

            return;
          }

          if (
            code === null
          ) {
            reject(
              new Error(
                "MSI operation ended without an exit code",
              ),
            );

            return;
          }

          resolve({
            exitCode:
              code,
            stdout:
              stdout.trim(),
            stderr:
              stderr.trim(),
          });
        },
      );
    },
  );
}

function isInstallSuccessCode(
  code: number,
): boolean {
  return (
    code === 0 ||
    code === 1641 ||
    code === 3010
  );
}

function isUninstallSuccessCode(
  code: number,
): boolean {
  return (
    code === 0 ||
    code === 1605 ||
    code === 1614 ||
    code === 1641 ||
    code === 3010
  );
}

function restartRequired(
  code: number,
): boolean {
  return (
    code === 1641 ||
    code === 3010
  );
}

export async function executeMsiPackageCommand(
  commandId: string,
  operation: MsiPackageOperation,
  payloadInput: unknown,
): Promise<unknown> {
  if (
    process.platform !==
    "win32"
  ) {
    throw new Error(
      "MSI package operations require Windows",
    );
  }

  const payload =
    validatePackagePayload(
      payloadInput,
    );

  if (
    operation ===
    "UNINSTALL_APP"
  ) {
    const execution =
      await runMsiexec([
        "/x",
        payload.productCode,
        "/qn",
        "/norestart",
      ]);

    if (
      !isUninstallSuccessCode(
        execution.exitCode,
      )
    ) {
      throw new Error(
        "MSI uninstall failed with exit code " +
          String(
            execution.exitCode,
          ),
      );
    }

    return {
      operation,
      packageId:
        payload.packageId,
      name:
        payload.name,
      version:
        payload.version,
      productCode:
        payload.productCode,
      exitCode:
        execution.exitCode,
      alreadyAbsent:
        execution.exitCode ===
          1605 ||
        execution.exitCode ===
          1614,
      restartRequired:
        restartRequired(
          execution.exitCode,
        ),
    };
  }

  const programData =
    process.env.ProgramData
      ?.trim() ||
    "C:\\ProgramData";

  const safeCommandId =
    commandId.replace(
      /[^A-Za-z0-9._-]/g,
      "_",
    );

  const stagingRoot =
    path.join(
      programData,
      "AI-BOS",
      "DeviceAgent",
      "packages",
      safeCommandId,
    );

  const msiPath =
    path.join(
      stagingRoot,
      "package.msi",
    );

  await rm(
    stagingRoot,
    {
      recursive: true,
      force: true,
    },
  );

  await mkdir(
    stagingRoot,
    {
      recursive: true,
    },
  );

  try {
    const downloadedBytes =
      await downloadHttpsFile(
        payload.downloadUrl,
        msiPath,
      );

    const actualSha256 =
      await calculateSha256(
        msiPath,
      );

    if (
      actualSha256 !==
      payload.sha256
    ) {
      throw new Error(
        "Package SHA256 verification failed",
      );
    }

    const execution =
      await runMsiexec([
        "/i",
        msiPath,
        "/qn",
        "/norestart",
      ]);

    if (
      !isInstallSuccessCode(
        execution.exitCode,
      )
    ) {
      throw new Error(
        "MSI operation failed with exit code " +
          String(
            execution.exitCode,
          ),
      );
    }

    return {
      operation,
      packageId:
        payload.packageId,
      name:
        payload.name,
      version:
        payload.version,
      publisher:
        payload.publisher,
      productCode:
        payload.productCode,
      downloadedBytes,
      verifiedSha256:
        actualSha256,
      exitCode:
        execution.exitCode,
      restartRequired:
        restartRequired(
          execution.exitCode,
        ),
    };
  } finally {
    await rm(
      stagingRoot,
      {
        recursive: true,
        force: true,
      },
    );
  }
}
