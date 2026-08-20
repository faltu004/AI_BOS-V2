import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Activity,
  RefreshCw,
  Send,
} from "lucide-react";

import {
  formatDateTime,
} from "@shared/lib/utils-helpers";

import {
  Button,
} from "@shared/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/ui/card";

import {
  fetchDeviceCommands,
  sendDevicePingCommand,
  sendDevicePowerAction,
  type DeviceCommand,
  type DeviceCommandStatus,
  type DevicePowerCommandType,
} from "./monitoring.api";

type DeviceCommandsPanelProps = {
  deviceId: string;
  token: string | undefined;
};

function statusLabel(
  status: DeviceCommandStatus,
): string {
  if (status === "sent") {
    return "Delivered";
  }

  if (status === "completed") {
    return "Succeeded";
  }

  if (
    status === "acknowledged"
  ) {
    return "Acknowledged";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

function commandOutcome(
  command: DeviceCommand,
): string {
  if (command.errorMessage) {
    return command.errorMessage;
  }

  if (command.result === undefined || command.result === null) {
    return "—";
  }

  if (typeof command.result === "string") {
    return command.result;
  }

  return JSON.stringify(command.result);
}

function statusClass(
  status: DeviceCommandStatus,
): string {
  if (
    status === "completed"
  ) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (
    status === "failed" ||
    status === "expired" ||
    status === "cancelled"
  ) {
    return "text-rose-600 dark:text-rose-400";
  }

  if (
    status === "running" ||
    status === "acknowledged" ||
    status === "sent"
  ) {
    return "text-amber-600 dark:text-amber-400";
  }

  return "text-muted-foreground";
}

function powerActionLabel(
  type: DevicePowerCommandType,
): string {
  return type === "RESTART_DEVICE"
    ? "Restart"
    : "Shutdown";
}

function confirmationWord(
  type: DevicePowerCommandType,
): string {
  return type === "RESTART_DEVICE"
    ? "RESTART"
    : "SHUTDOWN";
}

export function DeviceCommandsPanel({
  deviceId,
  token,
}: DeviceCommandsPanelProps) {
  const [
    commands,
    setCommands,
  ] =
    useState<DeviceCommand[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    sendingPower,
    setSendingPower,
  ] =
    useState(false);

  const [
    pendingPowerAction,
    setPendingPowerAction,
  ] =
    useState<DevicePowerCommandType | null>(
      null,
    );

  const [
    powerReason,
    setPowerReason,
  ] =
    useState("");

  const [
    powerDelay,
    setPowerDelay,
  ] =
    useState("300");

  const [
    powerConfirmation,
    setPowerConfirmation,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const loadCommands =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const result =
            await fetchDeviceCommands(
              deviceId,
              token,
            );

          setCommands(
            result.commands ?? [],
          );

          setError(null);
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load device commands.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        deviceId,
        token,
      ],
    );

  useEffect(
    () => {
      void loadCommands();

      const timer =
        window.setInterval(
          () => {
            void loadCommands();
          },
          5000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      loadCommands,
    ],
  );

  async function sendPing() {
    if (
      sending ||
      sendingPower
    ) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await sendDevicePingCommand(
        deviceId,
        token,
      );

      await loadCommands();
    } catch (
      sendError
    ) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to send PING command.",
      );
    } finally {
      setSending(false);
    }
  }

  function beginPowerAction(
    type: DevicePowerCommandType,
  ) {
    if (
      sending ||
      sendingPower
    ) {
      return;
    }

    setPendingPowerAction(
      type,
    );

    setPowerReason("");
    setPowerDelay("300");
    setPowerConfirmation("");
    setError(null);
  }

  function cancelPowerAction() {
    if (sendingPower) {
      return;
    }

    setPendingPowerAction(null);
    setPowerReason("");
    setPowerDelay("300");
    setPowerConfirmation("");
  }

  async function confirmPowerAction() {
    if (
      !pendingPowerAction ||
      sendingPower
    ) {
      return;
    }

    const reason =
      powerReason.trim();

    if (
      reason.length < 3 ||
      reason.length > 200
    ) {
      setError(
        "Power action reason must be between 3 and 200 characters.",
      );

      return;
    }

    const delaySeconds =
      Number(
        powerDelay,
      );

    if (
      !Number.isInteger(
        delaySeconds,
      ) ||
      delaySeconds < 60 ||
      delaySeconds > 3600
    ) {
      setError(
        "Power action delay must be a whole number between 60 and 3600 seconds.",
      );

      return;
    }

    const expectedWord =
      confirmationWord(
        pendingPowerAction,
      );

    if (
      powerConfirmation.trim() !==
      expectedWord
    ) {
      setError(
        "Type " +
          expectedWord +
          " exactly to confirm this action.",
      );

      return;
    }

    setSendingPower(true);
    setError(null);

    try {
      await sendDevicePowerAction(
        deviceId,
        pendingPowerAction,
        reason,
        delaySeconds,
        token,
      );

      setPendingPowerAction(null);
      setPowerReason("");
      setPowerDelay("300");
      setPowerConfirmation("");

      await loadCommands();
    } catch (
      sendError
    ) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to queue device power action.",
      );
    } finally {
      setSendingPower(false);
    }
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Device Commands
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Send approved commands and track their execution status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={
                loading
              }
              onClick={() =>
                void loadCommands()
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw
                className={
                  "mr-2 h-4 w-4" +
                  (
                    loading
                      ? " animate-spin"
                      : ""
                  )
                }
              />

              Refresh
            </Button>

            <Button
              disabled={
                sending ||
                sendingPower
              }
              onClick={() =>
                void sendPing()
              }
              size="sm"
              type="button"
            >
              <Send className="mr-2 h-4 w-4" />

              {sending
                ? "Sending..."
                : "Send PING"}
            </Button>

            <Button
              disabled={
                sending ||
                sendingPower
              }
              onClick={() =>
                beginPowerAction(
                  "RESTART_DEVICE",
                )
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Restart
            </Button>

            <Button
              disabled={
                sending ||
                sendingPower
              }
              onClick={() =>
                beginPowerAction(
                  "SHUTDOWN_DEVICE",
                )
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Shutdown
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {pendingPowerAction && (
          <div className="space-y-4 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
            <div>
              <div className="font-medium">
                Confirm device{" "}
                {powerActionLabel(
                  pendingPowerAction,
                ).toLowerCase()}
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                This queues a managed Windows power action.
                The endpoint will receive the configured
                countdown before the action is attempted.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">
                  Reason
                </span>

                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={
                    sendingPower
                  }
                  maxLength={200}
                  onChange={(event) =>
                    setPowerReason(
                      event.target.value,
                    )
                  }
                  placeholder="Example: Scheduled maintenance"
                  type="text"
                  value={
                    powerReason
                  }
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">
                  Delay in seconds
                </span>

                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={
                    sendingPower
                  }
                  max={3600}
                  min={60}
                  onChange={(event) =>
                    setPowerDelay(
                      event.target.value,
                    )
                  }
                  step={1}
                  type="number"
                  value={
                    powerDelay
                  }
                />

                <span className="block text-xs text-muted-foreground">
                  Allowed range: 60–3600 seconds.
                </span>
              </label>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">
                Type{" "}
                <code>
                  {confirmationWord(
                    pendingPowerAction,
                  )}
                </code>{" "}
                to confirm
              </span>

              <input
                autoComplete="off"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                disabled={
                  sendingPower
                }
                onChange={(event) =>
                  setPowerConfirmation(
                    event.target.value,
                  )
                }
                type="text"
                value={
                  powerConfirmation
                }
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                disabled={
                  sendingPower
                }
                onClick={
                  cancelPowerAction
                }
                type="button"
                variant="outline"
              >
                Cancel
              </Button>

              <Button
                disabled={
                  sendingPower
                }
                onClick={() =>
                  void confirmPowerAction()
                }
                type="button"
              >
                {sendingPower
                  ? "Queueing..."
                  : "Confirm " +
                    powerActionLabel(
                      pendingPowerAction,
                    )}
              </Button>
            </div>
          </div>
        )}

        {loading &&
        commands.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Loading device commands...
          </div>
        ) : commands.length ===
          0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No commands have been sent to this device yet.
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium">
                    Command
                  </th>

                  <th className="p-3 font-medium">
                    Status
                  </th>

                  <th className="p-3 font-medium">
                    Attempts
                  </th>

                  <th className="p-3 font-medium">
                    Requested
                  </th>

                  <th className="p-3 font-medium">
                    Requested By
                  </th>

                  <th className="p-3 font-medium">
                    Completed
                  </th>

                  <th className="p-3 font-medium">
                    Result / Error
                  </th>
                </tr>
              </thead>

              <tbody>
                {commands.map(
                  (
                    command,
                  ) => (
                    <tr
                      className="border-b last:border-b-0"
                      key={
                        command.commandId
                      }
                    >
                      <td className="p-3">
                        <div className="font-medium">
                          {
                            command.type
                          }
                        </div>

                        <div className="max-w-64 truncate text-xs text-muted-foreground">
                          {
                            command.commandId
                          }
                        </div>
                      </td>

                      <td
                        className={
                          "p-3 font-medium " +
                          statusClass(
                            command.status,
                          )
                        }
                      >
                        {statusLabel(
                          command.status,
                        )}
                      </td>

                      <td className="p-3">
                        {
                          command.attemptCount ??
                          0
                        }
                      </td>

                      <td className="p-3 text-xs">
                        {command.requestedAt
                          ? formatDateTime(
                              command.requestedAt,
                            )
                          : "—"}
                      </td>

                      <td className="p-3 text-xs">
                        {command.requestedBy ?? "—"}
                      </td>

                      <td className="p-3 text-xs">
                        {command.completedAt
                          ? formatDateTime(
                              command.completedAt,
                            )
                          : "—"}
                      </td>

                      <td className="max-w-72 p-3 text-xs">
                        <span className="block truncate" title={commandOutcome(command)}>
                          {commandOutcome(command)}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Approved actions: PING, Restart, Shutdown
          {" · "}
          Restart and Shutdown require explicit confirmation
          {" · "}
          Auto refresh every 5 seconds
        </div>
      </CardContent>
    </Card>
  );
}
