import {
  getDeviceAuthHeaders,
} from "./device-auth.js";
import axios from "axios";

import {
  config,
} from "./config.js";

import {
  executeMsiPackageCommand,
  type MsiPackagePayload,
} from "./msi-package-executor.js";

import {
  executeDevicePowerCommand,
  type DevicePowerCommandPayload,
} from "./device-power-executor.js";

import {
  deleteCommandJournal,
  readCommandJournalEntries,
  writeCommandJournal,
  type CommandJournalEntry,
} from "./command-journal.js";

type DeviceCommandType =
  | "PING"
  | "INSTALL_APP"
  | "UNINSTALL_APP"
  | "UPDATE_APP"
  | "RESTART_DEVICE"
  | "SHUTDOWN_DEVICE";


type PingDeviceCommand = {
  commandId: string;
  deviceId: string;
  type: "PING";
  status: string;
  payload?: null;
};

type AppDeviceCommand = {
  commandId: string;
  deviceId: string;

  type:
    | "INSTALL_APP"
    | "UNINSTALL_APP"
    | "UPDATE_APP";

  status: string;

  payload: MsiPackagePayload;
};

type PowerDeviceCommand = {
  commandId: string;
  deviceId: string;

  type:
    | "RESTART_DEVICE"
    | "SHUTDOWN_DEVICE";

  status: string;

  payload:
    DevicePowerCommandPayload;
};

type DeviceCommand =
  | PingDeviceCommand
  | AppDeviceCommand
  | PowerDeviceCommand;

type CommandStatus =
  | "acknowledged"
  | "running"
  | "completed"
  | "failed";

type StartDeviceCommandPollerOptions = {
  deviceId: string;

  getAuthHeaders?: (
    deviceId: string,
  ) => Promise<Record<string, string>>;
};

const pollIntervalMs =
  5_000;

const statusRetryDelaysMs = [
  0,
  1_000,
  2_000,
  4_000,
] as const;

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

async function postStatus(
  deviceId: string,
  commandId: string,
  status: CommandStatus,
  authHeaders: (
    deviceId: string,
  ) => Promise<Record<string, string>>,
  result?: unknown,
  errorMessage?: string,
): Promise<void> {
  await axios.post(
    config.backendUrl +
      "/api/v1/devices/commands/status",
    {
      deviceId,
      commandId,
      status,
      result,
      errorMessage,
    },
    {
      headers: {
        "Content-Type":
          "application/json",

        ...(await authHeaders(deviceId)),
      },

      timeout:
        10_000,
    },
  );
}

async function sendStatusWithRetry(
  deviceId: string,
  commandId: string,
  status: CommandStatus,
  authHeaders: (
    deviceId: string,
  ) => Promise<Record<string, string>>,
  result?: unknown,
  errorMessage?: string,
): Promise<void> {
  let lastError:
    unknown = null;

  for (
    let attempt = 0;
    attempt <
    statusRetryDelaysMs.length;
    attempt += 1
  ) {
    const delay =
      statusRetryDelaysMs[
        attempt
      ] ?? 0;

    if (delay > 0) {
      await sleep(
        delay,
      );
    }

    try {
      await postStatus(
        deviceId,
        commandId,
        status,
        authHeaders,
        result,
        errorMessage,
      );

      return;
    } catch (
      error
    ) {
      lastError =
        error;

      console.error(
        "[Command] Status retry " +
          String(
            attempt + 1,
          ) +
          "/" +
          String(
            statusRetryDelaysMs.length,
          ) +
          " failed | " +
          status +
          " | " +
          commandId,
      );
    }
  }

  if (
    lastError instanceof Error
  ) {
    throw lastError;
  }

  throw new Error(
    "Unable to report command status",
  );
}

async function recoverPendingCommandReports(
  deviceId: string,
  authHeaders: (
    deviceId: string,
  ) => Promise<Record<string, string>>,
): Promise<void> {
  const entries =
    await readCommandJournalEntries();

  for (
    const originalEntry of entries
  ) {
    if (
      originalEntry.deviceId !==
      deviceId
    ) {
      continue;
    }

    let entry:
      CommandJournalEntry =
      originalEntry;

    if (
      entry.status ===
      "running"
    ) {
      entry = {
        ...entry,

        status:
          "failed",

        result:
          null,

        errorMessage:
          "Agent restarted while command execution was in progress. Operation state requires reconciliation.",

        updatedAt:
          new Date()
            .toISOString(),
      };

      await writeCommandJournal(
        entry,
      );
    }

    try {
      await sendStatusWithRetry(
        entry.deviceId,
        entry.commandId,
        entry.status,
        authHeaders,
        entry.result,
        entry.errorMessage ??
          undefined,
      );

      await deleteCommandJournal(
        entry.commandId,
      );

      console.log(
        "[Command] Recovered terminal status | " +
          entry.status +
          " | " +
          entry.commandId,
      );
    } catch (
      error
    ) {
      console.error(
        "[Command] Pending terminal status still not delivered | " +
          entry.commandId,
        error,
      );
    }
  }
}
async function executeCommand(
  command: DeviceCommand,
): Promise<unknown> {
  if (
    command.type ===
    "PING"
  ) {
    return {
      message:
        "pong",

      deviceId:
        command.deviceId,

      completedAt:
        new Date()
          .toISOString(),
    };
  }

  if (
    command.type ===
      "RESTART_DEVICE" ||
    command.type ===
      "SHUTDOWN_DEVICE"
  ) {
    return executeDevicePowerCommand(
      command.type,
      command.payload,
    );
  }

  if (
    command.type ===
      "INSTALL_APP" ||
    command.type ===
      "UNINSTALL_APP" ||
    command.type ===
      "UPDATE_APP"
  ) {
    return executeMsiPackageCommand(
      command.commandId,
      command.type,
      command.payload,
    );
  }

  throw new Error(
    "Unsupported command type",
  );
}
export function startDeviceCommandPoller({
  deviceId,
  getAuthHeaders = getDeviceAuthHeaders,
}: StartDeviceCommandPollerOptions): () => void {
  let stopped =
    false;

  let busy =
    false;

  async function poll(): Promise<void> {
    if (
      stopped ||
      busy
    ) {
      return;
    }

    busy =
      true;

    try {
      await recoverPendingCommandReports(
        deviceId,
        getAuthHeaders,
      );

      const response =
        await axios.get(
          config.backendUrl +
            "/api/v1/devices/commands/next",
          {
            params: {
              deviceId,
            },

            headers: {
              ...(await getAuthHeaders(deviceId)),
            },

            timeout:
              30_000,
          },
        );

      const command =
        response.data?.data as
          DeviceCommand | null;

      if (!command) {
        return;
      }

      if (
        command.deviceId !==
        deviceId
      ) {
        throw new Error(
          "Received command for another device",
        );
      }

      console.log(
        "[Command] Received | " +
          command.type +
          " | " +
          command.commandId,
      );

      /*
       * Do not execute anything unless
       * acknowledgement and running state
       * have successfully reached backend.
       */
      await sendStatusWithRetry(
        deviceId,
        command.commandId,
        "acknowledged",
        getAuthHeaders,
      );

      await sendStatusWithRetry(
        deviceId,
        command.commandId,
        "running",
        getAuthHeaders,
      );

      try {
        await writeCommandJournal({
          commandId:
            command.commandId,

          deviceId,

          type:
            command.type,

          status:
            "running",

          result:
            null,

          errorMessage:
            null,

          updatedAt:
            new Date()
              .toISOString(),
        });
      } catch (
        journalError
      ) {
        const journalMessage =
          "Unable to create local command recovery journal";

        try {
          await sendStatusWithRetry(
            deviceId,
            command.commandId,
            "failed",
            getAuthHeaders,
            null,
            journalMessage,
          );
        } catch (
          statusError
        ) {
          console.error(
            "[Command] Unable to report journal failure:",
            statusError,
          );
        }

        console.error(
          "[Command] " +
            journalMessage,
          journalError,
        );

        return;
      }

      let terminalStatus:
        "completed" | "failed";

      let terminalResult:
        unknown = null;

      let terminalError:
        string | undefined;

      try {
        terminalResult =
          await executeCommand(
            command,
          );

        terminalStatus =
          "completed";
      } catch (
        executionError
      ) {
        terminalStatus =
          "failed";

        terminalError =
          executionError instanceof Error
            ? executionError.message
            : "Command execution failed";
      }

      const terminalJournal:
        CommandJournalEntry = {
          commandId:
            command.commandId,

          deviceId,

          type:
            command.type,

          status:
            terminalStatus,

          result:
            terminalResult,

          errorMessage:
            terminalError ??
            null,

          updatedAt:
            new Date()
              .toISOString(),
        };

      try {
        await writeCommandJournal(
          terminalJournal,
        );
      } catch (
        journalError
      ) {
        console.error(
          "[Command] Unable to persist terminal command result:",
          journalError,
        );
      }

      try {
        await sendStatusWithRetry(
          deviceId,
          command.commandId,
          terminalStatus,
          getAuthHeaders,
          terminalResult,
          terminalError,
        );

        await deleteCommandJournal(
          command.commandId,
        );
      } catch (
        statusError
      ) {
        console.error(
          "[Command] Unable to report terminal status | " +
            terminalStatus +
            " | " +
            command.commandId,
          statusError,
        );

        return;
      }
      if (
        terminalStatus ===
        "completed"
      ) {
        console.log(
          "[Command] Completed | " +
            command.type +
            " | " +
            command.commandId,
        );
      } else {
        console.error(
          "[Command] Failed | " +
            command.type +
            " | " +
            String(
              terminalError,
            ),
        );
      }
    } catch (
      error
    ) {
      if (
        axios.isAxiosError(
          error,
        )
      ) {
        console.error(
          "[Command] Poll error:",
          error.message,
        );
      } else {
        console.error(
          "[Command] Poll error:",
          error,
        );
      }
    } finally {
      busy =
        false;
    }
  }

  console.log(
    "[Command] Polling every " +
      pollIntervalMs /
        1000 +
      " seconds.",
  );

  void poll();

  const timer =
    setInterval(
      () => {
        void poll();
      },
      pollIntervalMs,
    );

  return () => {
    stopped =
      true;

    clearInterval(
      timer,
    );
  };
}




