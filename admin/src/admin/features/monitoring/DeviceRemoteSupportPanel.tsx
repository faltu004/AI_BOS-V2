import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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
  createRemoteSupportSession,
  endRemoteSupportSession,
  fetchCurrentRemoteSupportSession,
  fetchRemoteSupportSession,
  issueRemoteSupportViewerToken,
  type RemoteSupportSession,
} from "./monitoring.api";

import {
  RemoteSupportLiveViewer,
} from "./RemoteSupportLiveViewer";

type DeviceRemoteSupportPanelProps = {
  deviceId: string;
  token: string | undefined;
  employeeSessionAvailable: boolean;
};

function statusText(
  session:
    RemoteSupportSession,
): string {
  switch (
    session.status
  ) {
    case "pending_consent":
      return "Waiting for user consent";

    case "ready":
      return "User approved — ready to connect";

    case "active":
      return "Remote support active";

    case "declined":
      return "User declined request";

    case "ended":
      return "Session ended";

    case "expired":
      return "Request expired";

    default:
      return session.status;
  }
}

function isTerminalStatus(
  status:
    RemoteSupportSession["status"],
): boolean {
  return (
    status ===
      "declined" ||
    status ===
      "ended" ||
    status ===
      "expired"
  );
}

export function DeviceRemoteSupportPanel({
  deviceId,
  token,
  employeeSessionAvailable,
}: DeviceRemoteSupportPanelProps) {
  const [
    session,
    setSession,
  ] =
    useState<RemoteSupportSession | null>(
      null,
    );

  const viewerTokenRef =
    useRef<string | null>(
      null,
    );

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    ending,
    setEnding,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const current =
          await fetchCurrentRemoteSupportSession(
            deviceId,
            token,
          );

        if (
          cancelled
        ) {
          return;
        }

        setSession(current);

        if (
          current &&
          (
            current.status ===
              "ready" ||
            current.status ===
              "active"
          )
        ) {
          const rotated =
            await issueRemoteSupportViewerToken(
              deviceId,
              current.sessionId,
              token,
            );

          if (
            !cancelled
          ) {
            viewerTokenRef.current =
              rotated.viewerToken;

            setSession(
              rotated.session,
            );
          }
        }
      } catch (
        loadError
      ) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load current remote support state.",
          );
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deviceId, token]);

  const refreshSession =
    useCallback(
      async () => {
        if (
          !session ||
          isTerminalStatus(
            session.status,
          )
        ) {
          return;
        }

        try {
          const latest =
            await fetchRemoteSupportSession(
              deviceId,
              session.sessionId,
              token,
            );

          setSession(
            latest,
          );

          if (
            isTerminalStatus(
              latest.status,
            )
          ) {
            viewerTokenRef.current =
              null;
          }
        } catch (
          refreshError
        ) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Failed to refresh remote support session.",
          );
        }
      },
      [
        deviceId,
        session,
        token,
      ],
    );

  useEffect(
    () => {
      if (
        !session ||
        isTerminalStatus(
          session.status,
        )
      ) {
        return;
      }

      const timer =
        window.setInterval(
          () => {
            void refreshSession();
          },
          2_000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      refreshSession,
      session,
    ],
  );

  async function startSession():
    Promise<void> {
    if (
      session &&
      !isTerminalStatus(
        session.status,
      )
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Request remote support for this device?\n\n" +
          "The user must explicitly Allow the session before screen viewing or control can begin.",
      );

    if (!confirmed) {
      return;
    }

    setCreating(
      true,
    );

    setError(
      null,
    );

    try {
      const result =
        await createRemoteSupportSession(
          deviceId,
          token,
        );

      viewerTokenRef.current =
        result.viewerToken;

      setSession(
        result.session,
      );
    } catch (
      startError
    ) {
      viewerTokenRef.current =
        null;

      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to create remote support request.",
      );
    } finally {
      setCreating(
        false,
      );
    }
  }

  async function endSession():
    Promise<void> {
    if (!session) {
      return;
    }

    setEnding(
      true,
    );

    setError(
      null,
    );

    try {
      const ended =
        await endRemoteSupportSession(
          deviceId,
          session.sessionId,
          token,
        );

      viewerTokenRef.current =
        null;

      setSession(
        ended,
      );
    } catch (
      endError
    ) {
      setError(
        endError instanceof Error
          ? endError.message
          : "Failed to end remote support session.",
      );
    } finally {
      setEnding(
        false,
      );
    }
  }

  const canStart =
    !session ||
    isTerminalStatus(
      session.status,
    );

  const canEnd =
    Boolean(
      session &&
      !isTerminalStatus(
        session.status,
      ),
    );

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>
          Remote Support
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Authorized remote support requires visible user consent before screen viewing or remote control.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border p-3 text-sm">
            {error}
          </div>
        )}

        {initialLoading ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Loading remote support state...
          </div>
        ) : !session ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {employeeSessionAvailable
              ? "Available. No remote support session has been requested."
              : "Employee session unavailable. Remote support cannot start until an employee session is available."}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">
                  {statusText(
                    session,
                  )}
                </div>

                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {session.sessionId}
                </div>
              </div>

              <span className="rounded-full border px-2.5 py-1 text-xs">
                {session.status}
              </span>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  Screen
                </div>

                <div>
                  {session.capabilities.screenView
                    ? "Requested"
                    : "Off"}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Control
                </div>

                <div>
                  {session.capabilities.remoteControl
                    ? "Requested"
                    : "Off"}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Recording
                </div>

                <div>
                  {session.capabilities.recording
                    ? "On"
                    : "OFF"}
                </div>
              </div>
            </div>

            {session.status ===
              "pending_consent" && (
              <div className="text-sm text-muted-foreground">
                Waiting for the device user to select Allow or Decline.
              </div>
            )}

            {(session.status ===
                "ready" ||
              session.status ===
                "active") &&
              viewerTokenRef.current && (
                <RemoteSupportLiveViewer
                  sessionId={
                    session.sessionId
                  }
                  token={token}
                  viewerToken={
                    viewerTokenRef.current
                  }
                />
              )}

            {(session.status ===
                "ready" ||
              session.status ===
                "active") &&
              !viewerTokenRef.current && (
                <div className="rounded-lg border p-3 text-sm">
                  Temporary viewer credential is no longer available in this page.
                  End this session and request a new one to reconnect.
                </div>
              )}

            {session.endReason && (
              <div className="text-sm text-muted-foreground">
                {session.endReason}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              creating ||
              !canStart
            }
            onClick={() =>
              void startSession()
            }
            type="button"
          >
            {creating
              ? "Requesting..."
              : "Start Remote Session"}
          </Button>

          {canEnd && (
            <Button
              disabled={
                ending
              }
              onClick={() =>
                void endSession()
              }
              type="button"
              variant="outline"
            >
              {ending
                ? "Ending..."
                : "End Session"}
            </Button>
          )}

          {session &&
            !isTerminalStatus(
              session.status,
            ) && (
              <Button
                onClick={() =>
                  void refreshSession()
                }
                type="button"
                variant="outline"
              >
                Refresh Status
              </Button>
            )}
        </div>

        <div className="text-xs text-muted-foreground">
          Session credentials are kept only in temporary page memory.
          No unattended remote access or recording is enabled.
        </div>
      </CardContent>
    </Card>
  );
}
