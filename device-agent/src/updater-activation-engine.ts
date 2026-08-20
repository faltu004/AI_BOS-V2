import {
  randomUUID,
} from "node:crypto";

import {
  appendFileSync,
  mkdirSync,
} from "node:fs";

import {
  appendFile,
  copyFile,
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import {
  fileURLToPath,
} from "node:url";

import {
  validateActivationRequest,
  type AgentActivationRequest,
} from "./agent-update-contract.js";

import {
  validateStagedAgentUpdatePackage,
} from "./agent-update-stager.js";

import {
  AGENT_UPDATE_SCHEMA_VERSION,
  getActivationRequestPath,
  getAgentHealthMarkerPath,
  getAgentInstallRoot,
  getRollbackRoot,
  getUpdateExtractedRoot,
  getUpdateTransactionsRoot,
  getUpdaterLockPath,
  getUpdateLocksRoot,
  getUpdateDataRoot,
} from "./agent-update-paths.js";

import {
  startFixedAgentService,
  stopFixedAgentService,
} from "./updater-service-control.js";

import {
  tryReportUpdaterStatus,
} from "./updater-status-reporter.js";

export type UpdateTransactionState =
  | "PREPARED"
  | "SERVICE_STOPPED"
  | "ACTIVATING"
  | "STARTED"
  | "HEALTH_PENDING"
  | "COMPLETED"
  | "ROLLBACK_REQUIRED"
  | "ROLLBACK_STARTED"
  | "ROLLED_BACK"
  | "FAILED";

export type UpdateTransaction = {
  schemaVersion: number;
  transactionId: string;
  requestId: string;
  packageId: string;
  sourceVersion: string;
  targetVersion: string;
  sha256: string;
  installRoot: string;
  stagedAgentRoot: string;
  rollbackAgentRoot: string;
  startedAt: string;
  activationStartedAt?: string;
  completedAt?: string;
  failedAt?: string;
  rollbackStartedAt?: string;
  rolledBackAt?: string;
  state: UpdateTransactionState;
  failureCategory?: string;
  safeErrorText?: string;
};

type AgentPackageMetadata = {
  name?: unknown;
  version?: unknown;
};

type AgentHealthMarker = {
  schemaVersion?: unknown;
  version?: unknown;
  status?: unknown;
  startedAt?: unknown;
  pid?: unknown;
};

const AGENT_SERVICE_WAIT_MS =
  60_000;

const AGENT_HEALTH_WAIT_MS =
  90_000;

const HEALTH_STABILITY_MS =
  5_000;

const UPDATER_POLL_INTERVAL_MS =
  30_000;

const MAX_ROLLBACK_HISTORY =
  3;

let shutdownRequested =
  false;

function delay(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
    );
}

function updaterRuntimeLogPath():
  string {
  return path.join(
    getUpdateDataRoot(),
    "logs",
    "updater-runtime.log",
  );
}

function safeDiagnosticText(
  value: unknown,
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  const text =
    value instanceof Error
      ? value.stack ||
        value.message
      : String(value);

  return text
    .replace(
      /[^\x20-\x7E\r\n]/g,
      " ",
    )
    .slice(
      0,
      2000,
    );
}

function safeDiagnosticValue(
  value: unknown,
): unknown {
  if (
    typeof value === "string"
  ) {
    return safeDiagnosticText(
      value,
    );
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  return safeDiagnosticText(
    value,
  );
}

function formatUpdaterRuntimeLog(
  event: string,
  details?: Record<string, unknown>,
): string {
  const safeDetails:
    Record<string, unknown> = {};

  for (const [
    key,
    value,
  ] of Object.entries(
    details ?? {},
  )) {
    safeDetails[key] =
      safeDiagnosticValue(
        value,
      );
  }

  return JSON.stringify({
    timestamp:
      new Date().toISOString(),
    event:
      safeDiagnosticText(
        event,
      ),
    pid:
      process.pid,
    details:
      safeDetails,
  }) + "\n";
}

async function writeUpdaterRuntimeLog(
  event: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const logPath =
    updaterRuntimeLogPath();

  await mkdir(
    path.dirname(
      logPath,
    ),
    {
      recursive: true,
    },
  );

  await appendFile(
    logPath,
    formatUpdaterRuntimeLog(
      event,
      details,
    ),
    "utf8",
  );
}

function writeUpdaterRuntimeLogSync(
  event: string,
  details?: Record<string, unknown>,
): void {
  try {
    const logPath =
      updaterRuntimeLogPath();

    mkdirSync(
      path.dirname(
        logPath,
      ),
      {
        recursive: true,
      },
    );

    appendFileSync(
      logPath,
      formatUpdaterRuntimeLog(
        event,
        details,
      ),
      "utf8",
    );
  } catch {
    // Process-exit diagnostics must never mask the real updater state.
  }
}

function safeErrorText(
  error: unknown,
): string {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown updater error";

  return message
    .replace(
      /[^\x20-\x7E]/g,
      " ",
    )
    .slice(
      0,
      500,
    );
}

async function readJsonFile<T>(
  filePath: string,
): Promise<T> {
  return JSON.parse(
    await readFile(
      filePath,
      "utf8",
    ),
  ) as T;
}

async function atomicWriteJson(
  filePath: string,
  value: unknown,
): Promise<void> {
  await mkdir(
    path.dirname(filePath),
    {
      recursive: true,
    },
  );

  const tempPath =
    path.join(
      path.dirname(filePath),
      "." +
        path.basename(filePath) +
        "." +
        randomUUID() +
        ".tmp",
    );

  const handle =
    await open(
      tempPath,
      "wx",
    );

  try {
    await handle.writeFile(
      JSON.stringify(
        value,
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

  await rename(
    tempPath,
    filePath,
  );
}

function transactionPath(
  transactionId: string,
): string {
  return path.join(
    getUpdateTransactionsRoot(),
    transactionId +
      ".json",
  );
}

function currentTransactionPath():
  string {
  return path.join(
    getUpdateTransactionsRoot(),
    "current.json",
  );
}

async function writeTransaction(
  transaction: UpdateTransaction,
): Promise<void> {
  await atomicWriteJson(
    transactionPath(
      transaction.transactionId,
    ),
    transaction,
  );

  await atomicWriteJson(
    currentTransactionPath(),
    transaction,
  );
}

async function updateTransaction(
  transaction: UpdateTransaction,
  patch: Partial<UpdateTransaction>,
): Promise<UpdateTransaction> {
  const next = {
    ...transaction,
    ...patch,
  };

  await writeTransaction(
    next,
  );

  return next;
}

async function pathExists(
  filePath: string,
): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
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
      return false;
    }

    throw error;
  }
}

function ensureInside(
  root: string,
  candidate: string,
  label: string,
): void {
  const resolvedRoot =
    path.resolve(root);

  const resolvedCandidate =
    path.resolve(candidate);

  if (
    resolvedCandidate !== resolvedRoot &&
    !resolvedCandidate.startsWith(
      resolvedRoot +
        path.sep,
    )
  ) {
    throw new Error(
      label +
        " is outside the fixed updater root",
    );
  }
}

async function readInstalledVersion(
  installRoot: string,
): Promise<string> {
  const packagePath =
    path.join(
      installRoot,
      "agent",
      "package.json",
    );

  const metadata =
    JSON.parse(
      await readFile(
        packagePath,
        "utf8",
      ),
    ) as AgentPackageMetadata;

  if (
    metadata.name !==
      "device-agent" ||
    typeof metadata.version !==
      "string"
  ) {
    throw new Error(
      "Installed agent package metadata is invalid",
    );
  }

  return metadata.version;
}

function releaseFromRequest(
  request: AgentActivationRequest,
) {
  return {
    version:
      request.version,
    packageId:
      request.packageId,
    packagePath:
      "/api/v1/devices/agent-update/package/" +
      encodeURIComponent(
        request.version,
      ),
    platform:
      "windows" as const,
    architecture:
      "x64" as const,
    sha256:
      request.sha256,
    sizeBytes:
      1,
    mandatory:
      false,
    publishedAt:
      request.createdAt,
  };
}

async function acquireUpdaterLock():
  Promise<() => Promise<void>> {
  await mkdir(
    getUpdateLocksRoot(),
    {
      recursive: true,
    },
  );

  const lockPath =
    getUpdaterLockPath();

  const handle =
    await open(
      lockPath,
      "wx",
    );

  await handle.writeFile(
    JSON.stringify(
      {
        schemaVersion:
          AGENT_UPDATE_SCHEMA_VERSION,
        pid:
          process.pid,
        createdAt:
          new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  await handle.sync();

  let released =
    false;

  return async () => {
    if (released) {
      return;
    }

    released =
      true;

    await handle.close();

    await rm(
      lockPath,
      {
        force: true,
      },
    );
  };
}

async function prepareTransaction(
  request: AgentActivationRequest,
): Promise<UpdateTransaction> {
  const installRoot =
    getAgentInstallRoot();

  const sourceVersion =
    await readInstalledVersion(
      installRoot,
    );

  const stagedRoot =
    path.join(
      getUpdateExtractedRoot(),
      request.packageId +
        ".new",
    );

  ensureInside(
    getUpdateExtractedRoot(),
    stagedRoot,
    "Staged update path",
  );

  await validateStagedAgentUpdatePackage(
    stagedRoot,
    releaseFromRequest(
      request,
    ),
  );

  const transactionId =
    "txn_" +
    randomUUID()
      .replace(
        /-/g,
        "",
      );

  const rollbackAgentRoot =
    path.join(
      getRollbackRoot(),
      transactionId,
      "agent",
    );

  ensureInside(
    getRollbackRoot(),
    rollbackAgentRoot,
    "Rollback path",
  );

  const transaction: UpdateTransaction = {
    schemaVersion:
      AGENT_UPDATE_SCHEMA_VERSION,
    transactionId,
    requestId:
      request.requestId,
    packageId:
      request.packageId,
    sourceVersion,
    targetVersion:
      request.version,
    sha256:
      request.sha256,
    installRoot,
    stagedAgentRoot:
      path.join(
        stagedRoot,
        "agent",
      ),
    rollbackAgentRoot,
    startedAt:
      new Date().toISOString(),
    state:
      "PREPARED",
  };

  await writeTransaction(
    transaction,
  );

  return transaction;
}

async function snapshotCurrentAgent(
  transaction: UpdateTransaction,
): Promise<void> {
  const currentAgentRoot =
    path.join(
      transaction.installRoot,
      "agent",
    );

  await rm(
    transaction.rollbackAgentRoot,
    {
      recursive: true,
      force: true,
    },
  );

  await mkdir(
    path.dirname(
      transaction.rollbackAgentRoot,
    ),
    {
      recursive: true,
    },
  );

  await cp(
    currentAgentRoot,
    transaction.rollbackAgentRoot,
    {
      recursive: true,
      force: false,
      errorOnExist: true,
      verbatimSymlinks: false,
    },
  );
}

async function replaceAgentPayload(
  transaction: UpdateTransaction,
): Promise<void> {
  const currentAgentRoot =
    path.join(
      transaction.installRoot,
      "agent",
    );

  const preservedEnvPath =
    path.join(
      getUpdateTransactionsRoot(),
      transaction.transactionId +
        ".env.preserve",
    );

  const installedEnvPath =
    path.join(
      currentAgentRoot,
      ".env",
    );

  const hasEnv =
    await pathExists(
      installedEnvPath,
    );

  if (hasEnv) {
    await copyFile(
      installedEnvPath,
      preservedEnvPath,
    );
  }

  await rm(
    currentAgentRoot,
    {
      recursive: true,
      force: true,
    },
  );

  await cp(
    transaction.stagedAgentRoot,
    currentAgentRoot,
    {
      recursive: true,
      force: false,
      errorOnExist: true,
      verbatimSymlinks: false,
    },
  );

  if (hasEnv) {
    await copyFile(
      preservedEnvPath,
      installedEnvPath,
    );
  }
}

async function restoreRollbackPayload(
  transaction: UpdateTransaction,
): Promise<void> {
  const currentAgentRoot =
    path.join(
      transaction.installRoot,
      "agent",
    );

  await rm(
    currentAgentRoot,
    {
      recursive: true,
      force: true,
    },
  );

  await cp(
    transaction.rollbackAgentRoot,
    currentAgentRoot,
    {
      recursive: true,
      force: false,
      errorOnExist: true,
      verbatimSymlinks: false,
    },
  );
}

async function waitForHealthMarker(
  expectedVersion: string,
  activationStartedAt: string,
  timeoutMs: number,
): Promise<void> {
  const deadline =
    Date.now() +
    timeoutMs;

  const activationTime =
    new Date(
      activationStartedAt,
    ).getTime();

  while (Date.now() < deadline) {
    try {
      const marker =
        await readJsonFile<AgentHealthMarker>(
          getAgentHealthMarkerPath(),
        );

      const markerTime =
        typeof marker.startedAt ===
          "string"
          ? new Date(
              marker.startedAt,
            ).getTime()
          : Number.NaN;

      if (
        marker.schemaVersion ===
          AGENT_UPDATE_SCHEMA_VERSION &&
        marker.status === "started" &&
        marker.version ===
          expectedVersion &&
        typeof marker.pid ===
          "number" &&
        Number.isSafeInteger(
          marker.pid,
        ) &&
        markerTime >
          activationTime
      ) {
        await delay(
          HEALTH_STABILITY_MS,
        );

        return;
      }
    } catch {
      // Marker may not exist yet while the service starts.
    }

    await delay(1000);
  }

  throw new Error(
    "Timed out waiting for fresh agent health marker",
  );
}

async function rollback(
  transaction: UpdateTransaction,
  reason: string,
): Promise<UpdateTransaction> {
  let current =
    await updateTransaction(
      transaction,
      {
        state:
          "ROLLBACK_STARTED",
        rollbackStartedAt:
          new Date().toISOString(),
        failureCategory:
          "activation",
        safeErrorText:
          reason,
      },
    );

  await tryReportUpdaterStatus({
    status:
      "rollback_started",
    fromVersion:
      current.targetVersion,
    toVersion:
      current.sourceVersion,
    packageId:
      current.packageId,
    failureCategory:
      "activation",
    safeErrorText:
      reason,
    metadata: {
      transactionId:
        current.transactionId,
    },
  });

  try {
    await restoreRollbackPayload(
      current,
    );

    await startFixedAgentService(
      AGENT_SERVICE_WAIT_MS,
    );

    await waitForHealthMarker(
      current.sourceVersion,
      current.rollbackStartedAt ??
        current.startedAt,
      AGENT_HEALTH_WAIT_MS,
    );

    current =
      await updateTransaction(
        current,
        {
          state:
            "ROLLED_BACK",
          rolledBackAt:
            new Date().toISOString(),
        },
      );

    await tryReportUpdaterStatus({
      status:
        "rolled_back",
      fromVersion:
        current.targetVersion,
      toVersion:
        current.sourceVersion,
      packageId:
        current.packageId,
      metadata: {
        transactionId:
          current.transactionId,
      },
    });

    return current;
  } catch (
    error
  ) {
    const failed =
      await updateTransaction(
      current,
      {
        state:
          "FAILED",
        failedAt:
          new Date().toISOString(),
        failureCategory:
          "rollback",
        safeErrorText:
          safeErrorText(error),
      },
    );

    await tryReportUpdaterStatus({
      status:
        "failed",
      fromVersion:
        failed.sourceVersion,
      toVersion:
        failed.targetVersion,
      packageId:
        failed.packageId,
      failureCategory:
        "rollback",
      safeErrorText:
        failed.safeErrorText ??
        null,
      metadata: {
        transactionId:
          failed.transactionId,
      },
    });

    return failed;
  }
}

async function pruneRollbackHistory():
  Promise<void> {
  if (
    !(await pathExists(
      getRollbackRoot(),
    ))
  ) {
    return;
  }

  const entries =
    await readdir(
      getRollbackRoot(),
      {
        withFileTypes: true,
      },
    );

  const directories =
    entries
      .filter(
        (entry) =>
          entry.isDirectory(),
      )
      .map(
        (entry) =>
          entry.name,
      )
      .sort()
      .reverse();

  for (
    const stale of directories.slice(
      MAX_ROLLBACK_HISTORY,
    )
  ) {
    await rm(
      path.join(
        getRollbackRoot(),
        stale,
      ),
      {
        recursive: true,
        force: true,
      },
    );
  }
}

export async function recoverInterruptedUpdateTransaction():
  Promise<UpdateTransaction | null> {
  if (
    !(await pathExists(
      currentTransactionPath(),
    ))
  ) {
    return null;
  }

  const transaction =
    await readJsonFile<UpdateTransaction>(
      currentTransactionPath(),
    );

  if (
    transaction.state ===
      "COMPLETED" ||
    transaction.state ===
      "ROLLED_BACK" ||
    transaction.state ===
      "FAILED"
  ) {
    return transaction;
  }

  return rollback(
    transaction,
    "Updater recovered an interrupted activation transaction",
  );
}

export async function activateRequestedAgentUpdate():
  Promise<UpdateTransaction | null> {
  const releaseLock =
    await acquireUpdaterLock();

  try {
    await recoverInterruptedUpdateTransaction();

    const requestPath =
      getActivationRequestPath();

    if (
      !(await pathExists(
        requestPath,
      ))
    ) {
      return null;
    }

    const request =
      validateActivationRequest(
        await readJsonFile(
          requestPath,
        ),
      );

    let transaction =
      await prepareTransaction(
        request,
      );

    try {
      await snapshotCurrentAgent(
        transaction,
      );

      await stopFixedAgentService(
        AGENT_SERVICE_WAIT_MS,
      );

      transaction =
        await updateTransaction(
          transaction,
          {
            state:
              "SERVICE_STOPPED",
          },
        );

      await tryReportUpdaterStatus({
        status:
          "service_stopped",
        fromVersion:
          transaction.sourceVersion,
        toVersion:
          transaction.targetVersion,
        packageId:
          transaction.packageId,
        metadata: {
          transactionId:
            transaction.transactionId,
        },
      });

      transaction =
        await updateTransaction(
          transaction,
          {
            state:
              "ACTIVATING",
            activationStartedAt:
              new Date().toISOString(),
          },
        );

      await tryReportUpdaterStatus({
        status:
          "activation_started",
        fromVersion:
          transaction.sourceVersion,
        toVersion:
          transaction.targetVersion,
        packageId:
          transaction.packageId,
        metadata: {
          transactionId:
            transaction.transactionId,
        },
      });

      await replaceAgentPayload(
        transaction,
      );

      await tryReportUpdaterStatus({
        status:
          "payload_activated",
        fromVersion:
          transaction.sourceVersion,
        toVersion:
          transaction.targetVersion,
        packageId:
          transaction.packageId,
        metadata: {
          transactionId:
            transaction.transactionId,
        },
      });

      transaction =
        await updateTransaction(
          transaction,
          {
            state:
              "STARTED",
          },
        );

      await startFixedAgentService(
        AGENT_SERVICE_WAIT_MS,
      );

      await tryReportUpdaterStatus({
        status:
          "service_started",
        fromVersion:
          transaction.sourceVersion,
        toVersion:
          transaction.targetVersion,
        packageId:
          transaction.packageId,
        metadata: {
          transactionId:
            transaction.transactionId,
        },
      });

      transaction =
        await updateTransaction(
          transaction,
          {
            state:
              "HEALTH_PENDING",
          },
        );

      await tryReportUpdaterStatus({
        status:
          "health_pending",
        fromVersion:
          transaction.sourceVersion,
        toVersion:
          transaction.targetVersion,
        packageId:
          transaction.packageId,
        metadata: {
          transactionId:
            transaction.transactionId,
        },
      });

      await waitForHealthMarker(
        transaction.targetVersion,
        transaction.activationStartedAt ??
          transaction.startedAt,
        AGENT_HEALTH_WAIT_MS,
      );

      transaction =
        await updateTransaction(
          transaction,
          {
            state:
              "COMPLETED",
            completedAt:
              new Date().toISOString(),
          },
        );

      await tryReportUpdaterStatus({
        status:
          "healthy",
        fromVersion:
          transaction.sourceVersion,
        toVersion:
          transaction.targetVersion,
        packageId:
          transaction.packageId,
        metadata: {
          transactionId:
            transaction.transactionId,
        },
      });

      await rm(
        requestPath,
        {
          force: true,
        },
      );

      await pruneRollbackHistory();

      return transaction;
    } catch (
      error
    ) {
      const failed =
        await updateTransaction(
          transaction,
          {
            state:
              "ROLLBACK_REQUIRED",
            failedAt:
              new Date().toISOString(),
            failureCategory:
              "activation",
            safeErrorText:
              safeErrorText(error),
          },
        );

      await tryReportUpdaterStatus({
        status:
          "failed",
        fromVersion:
          failed.sourceVersion,
        toVersion:
          failed.targetVersion,
        packageId:
          failed.packageId,
        failureCategory:
          "activation",
        safeErrorText:
          failed.safeErrorText ??
          null,
        metadata: {
          transactionId:
            failed.transactionId,
        },
      });

      return rollback(
        failed,
        safeErrorText(error),
      );
    }
  }
  finally {
    await releaseLock();
  }
}

export async function runUpdaterOnce():
  Promise<void> {
  const result =
    await activateRequestedAgentUpdate();

  if (!result) {
    console.log(
      "[Agent Updater] No activation request is pending.",
    );

    return;
  }

  console.log(
    "[Agent Updater] Update transaction " +
      result.transactionId +
      " finished with state " +
      result.state +
      ".",
  );
}

export async function runUpdaterService():
  Promise<void> {
  await writeUpdaterRuntimeLog(
    "startup",
    {
      argv1:
        process.argv[1] ?? "",
      cwd:
        process.cwd(),
      nodeVersion:
        process.version,
      platform:
        process.platform,
      agentMode:
        process.env.AGENT_MODE ?? "",
      installRoot:
        getAgentInstallRoot(),
      updateDataRoot:
        getUpdateDataRoot(),
    },
  );

  console.log(
    "[Agent Updater] Service loop started.",
  );

  await writeUpdaterRuntimeLog(
    "configuration_loaded",
    {
      installRoot:
        getAgentInstallRoot(),
      updateDataRoot:
        getUpdateDataRoot(),
      activationRequestPath:
        getActivationRequestPath(),
    },
  );

  try {
    await recoverInterruptedUpdateTransaction();
  } catch (
    error
  ) {
    await writeUpdaterRuntimeLog(
      "startup_recovery_failed",
      {
        error:
          safeDiagnosticText(
            error,
          ),
      },
    );

    console.error(
      "[Agent Updater] Startup recovery failed: " +
        safeErrorText(
          error,
        ),
    );
  }

  for (;;) {
    if (shutdownRequested) {
      await writeUpdaterRuntimeLog(
        "graceful_shutdown_requested",
      );
      return;
    }

    try {
      await writeUpdaterRuntimeLog(
        "update_check_initializing",
      );

      const result =
        await activateRequestedAgentUpdate();

      await writeUpdaterRuntimeLog(
        "update_check_completed",
        {
          pendingRequest:
            Boolean(
              result,
            ),
          transactionState:
            result?.state ??
            "none",
          transactionId:
            result?.transactionId ??
            "",
        },
      );
    } catch (
      error
    ) {
      await writeUpdaterRuntimeLog(
        "update_check_failed",
        {
          error:
            safeDiagnosticText(
              error,
            ),
        },
      );

      console.error(
        "[Agent Updater] Update check failed: " +
          safeErrorText(
            error,
          ),
      );
    }

    await delay(
      UPDATER_POLL_INTERVAL_MS,
    );
  }
}

function isMainModule():
  boolean {
  const entryPoint =
    process.argv[1];

  if (!entryPoint) {
    return false;
  }

  return path.resolve(
    fileURLToPath(
      import.meta.url,
    ),
  ) ===
    path.resolve(
      entryPoint,
    );
}

function installProcessDiagnostics():
  void {
  process.on(
    "uncaughtException",
    (
      error,
    ) => {
      writeUpdaterRuntimeLogSync(
        "uncaught_exception",
        {
          error:
            safeDiagnosticText(
              error,
            ),
        },
      );

      console.error(
        "[Agent Updater] Uncaught exception: " +
          safeErrorText(
            error,
          ),
      );

      process.exit(
        1,
      );
    },
  );

  process.on(
    "unhandledRejection",
    (
      reason,
    ) => {
      writeUpdaterRuntimeLogSync(
        "unhandled_rejection",
        {
          error:
            safeDiagnosticText(
              reason,
            ),
        },
      );

      console.error(
        "[Agent Updater] Unhandled rejection: " +
          safeErrorText(
            reason,
          ),
      );

      process.exit(
        1,
      );
    },
  );

  for (const signal of [
    "SIGINT",
    "SIGTERM",
  ] as const) {
    process.on(
      signal,
      () => {
        shutdownRequested =
          true;

        writeUpdaterRuntimeLogSync(
          "shutdown_signal",
          {
            signal,
          },
        );

        process.exit(
          0,
        );
      },
    );
  }

  process.on(
    "exit",
    (
      code,
    ) => {
      writeUpdaterRuntimeLogSync(
        "process_exit",
        {
          code,
          exitCode:
            process.exitCode ??
            code,
        },
      );
    },
  );
}

if (isMainModule()) {
  installProcessDiagnostics();

  runUpdaterService()
    .catch(
      async (
        error,
      ) => {
        const message =
          safeErrorText(
            error,
          );

        try {
          await mkdir(
            getUpdateTransactionsRoot(),
            {
              recursive: true,
            },
          );

          await writeFile(
            path.join(
              getUpdateTransactionsRoot(),
              "last-updater-error.txt",
            ),
            message,
            "utf8",
          );
        } catch {
          // Last-resort failure path: keep process exit accurate.
        }

        console.error(
          "[Agent Updater] " +
            message,
        );

        await writeUpdaterRuntimeLog(
          "fatal_startup_error",
          {
            error:
              message,
          },
        );

        process.exitCode =
          1;
      },
    );
}
