import {
  readFileSync,
} from "node:fs";

type PackageMetadata = {
  version?: unknown;
};

function readAgentVersion(): string {
  const packageUrl =
    new URL(
      "../package.json",
      import.meta.url,
    );

  const raw =
    readFileSync(
      packageUrl,
      "utf8",
    );

  const metadata =
    JSON.parse(
      raw,
    ) as PackageMetadata;

  if (
    typeof metadata.version !==
    "string"
  ) {
    throw new Error(
      "Device Agent package version is missing",
    );
  }

  const version =
    metadata.version.trim();

  if (
    version.length < 1 ||
    version.length > 50 ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
      version,
    )
  ) {
    throw new Error(
      "Device Agent package version is invalid",
    );
  }

  return version;
}

export const AGENT_VERSION =
  readAgentVersion();
