import path from "node:path";

export const AGENT_UPDATE_SCHEMA_VERSION = 1;

export const DEVICE_AGENT_SERVICE_NAME =
  "AIBOSDeviceAgent";

const programDataDirectory =
  process.platform === "win32"
    ? process.env.ProgramData ||
      "C:\\ProgramData"
    : path.resolve(
        process.cwd(),
        ".aibos-programdata",
      );

export function getAgentInstallRoot():
  string {
  if (
    process.env
      .AI_BOS_DEVICE_AGENT_INSTALL_ROOT
      ?.trim()
  ) {
    return path.resolve(
      process.env
        .AI_BOS_DEVICE_AGENT_INSTALL_ROOT,
    );
  }

  return process.platform === "win32"
    ? "C:\\AI-BOS\\DeviceAgent"
    : path.resolve(
        process.cwd(),
        "DeviceAgent",
      );
}

export function getUpdaterRoot():
  string {
  return path.join(
    programDataDirectory,
    "AI-BOS",
    "DeviceAgentUpdater",
  );
}

export function getUpdateDataRoot():
  string {
  return path.join(
    programDataDirectory,
    "AI-BOS",
    "DeviceAgent",
    "UpdateData",
  );
}

export function getUpdatePackagesRoot():
  string {
  return path.join(
    getUpdateDataRoot(),
    "packages",
  );
}

export function getUpdateExtractedRoot():
  string {
  return path.join(
    getUpdateDataRoot(),
    "extracted",
  );
}

export function getUpdateRequestsRoot():
  string {
  return path.join(
    getUpdateDataRoot(),
    "requests",
  );
}

export function getActivationRequestPath():
  string {
  return path.join(
    getUpdateRequestsRoot(),
    "activation-request.json",
  );
}

export function getUpdateLocksRoot():
  string {
  return path.join(
    getUpdateDataRoot(),
    "locks",
  );
}

export function getUpdaterLockPath():
  string {
  return path.join(
    getUpdateLocksRoot(),
    "activation.lock",
  );
}

export function getUpdateTransactionsRoot():
  string {
  return path.join(
    getUpdateDataRoot(),
    "transactions",
  );
}

export function getRollbackRoot():
  string {
  return path.join(
    getUpdateDataRoot(),
    "rollback",
  );
}

export function getAgentHealthRoot():
  string {
  return path.join(
    programDataDirectory,
    "AI-BOS",
    "DeviceAgent",
    "Health",
  );
}

export function getAgentHealthMarkerPath():
  string {
  return path.join(
    getAgentHealthRoot(),
    "agent-health.json",
  );
}
