import {
  execFile,
} from "node:child_process";

import {
  promisify,
} from "node:util";

import path from "node:path";

const execFileAsync =
  promisify(
    execFile,
  );

const POLL_INTERVAL_MS =
  5_000;

export type RemoteSupportRequest = {
  sessionId: string;

  requestedBy: string;
  requestedByRole: string;

  requestedAt: string;
  expiresAt: string;

  capabilities: {
    screenView: boolean;
    remoteControl: boolean;
    recording: boolean;
  };
};

export type ApprovedRemoteSupportSession = {
  sessionId: string;
  endpointToken: string;
  expiresAt: string;

  capabilities: {
    screenView: boolean;
    remoteControl: boolean;
    recording: boolean;
  };
};

type StartRemoteSupportConsentWatcherOptions = {
  api: RemoteSupportConsentApi;

  requestConsent?: (
    request: RemoteSupportRequest,
  ) => Promise<
    "allow" |
    "decline"
  >;

  onApproved?: (
    session: ApprovedRemoteSupportSession,
  ) =>
    void |
    Promise<void>;
};

export type RemoteSupportConsentApi = {
  getPending:
    () => Promise<{
      requests?: unknown;
    }>;

  submitDecision: (
    sessionId: string,
    decision:
      | "allow"
      | "decline",
  ) => Promise<{
    endpointToken?: unknown;
    session?: {
      expiresAt?: unknown;
    };
  }>;
};

function getPowerShellPath():
  string {
  const windowsDirectory =
    process.env.WINDIR ||
    "C:\\Windows";

  return path.join(
    windowsDirectory,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

async function showConsentPrompt(
  request: RemoteSupportRequest,
): Promise<
  "allow" |
  "decline"
> {
  if (
    process.platform !==
    "win32"
  ) {
    throw new Error(
      "Remote support consent prompt is available only on Windows.",
    );
  }

  const role =
    request.requestedByRole
      .trim()
      .slice(
        0,
        100,
      ) ||
    "Administrator";

  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$message = @(",
    '  "An authorized AI BOS administrator is requesting remote support.",',
    '  "",',
    '  "Requested by role: " + $env:AIBOS_REMOTE_REQUEST_ROLE,',
    '  "",',
    '  "If you allow:",',
    '  "• Your screen may be viewed",',
    '  "• Mouse and keyboard may be remotely controlled",',
    '  "• Recording is OFF",',
    '  "",',
    '  "Allow remote support?"',
    ') -join [Environment]::NewLine',
    "$result = [System.Windows.Forms.MessageBox]::Show(",
    "  $message,",
    '  "AI BOS Remote Support",',
    "  [System.Windows.Forms.MessageBoxButtons]::YesNo,",
    "  [System.Windows.Forms.MessageBoxIcon]::Information,",
    "  [System.Windows.Forms.MessageBoxDefaultButton]::Button2",
    ")",
    'if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {',
    '  Write-Output "ALLOW"',
    "} else {",
    '  Write-Output "DECLINE"',
    "}",
  ].join(
    "\n",
  );

  const result =
    await execFileAsync(
      getPowerShellPath(),
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        script,
      ],
      {
        windowsHide:
          false,

        env: {
          ...process.env,

          AIBOS_REMOTE_REQUEST_ROLE:
            role,
        },

        timeout:
          5 * 60 * 1000,

        maxBuffer:
          1024 * 1024,
      },
    );

  const decision =
    result.stdout
      .trim()
      .toUpperCase();

  return decision ===
    "ALLOW"
      ? "allow"
      : "decline";
}

export function startRemoteSupportConsentWatcher({
  api,
  requestConsent = showConsentPrompt,
  onApproved,
}: StartRemoteSupportConsentWatcherOptions): () => void {
  let stopped =
    false;

  let polling =
    false;

  const completedSessions =
    new Set<string>();

  const pendingDecisions =
    new Map<
      string,
      "allow" |
      "decline"
    >();

  async function submitDecision(
    request: RemoteSupportRequest,
    decision:
      | "allow"
      | "decline",
  ): Promise<boolean> {
    try {
      const result =
        await api
          .submitDecision(
            request.sessionId,
            decision,
          );

      if (
        decision ===
        "decline"
      ) {
        console.log(
          "[Remote Support] User declined session " +
            request.sessionId,
        );

        return true;
      }

      const endpointToken =
        result
          ?.endpointToken;

      if (
        typeof endpointToken !==
          "string" ||
        !endpointToken
      ) {
        throw new Error(
          "Approved remote support response did not contain an endpoint token.",
        );
      }


      const expiresAt =
        result.session
          ?.expiresAt;

      if (
        typeof expiresAt !==
          "string" ||
        !Number.isFinite(
          Date.parse(
            expiresAt,
          ),
        )
      ) {
        throw new Error(
          "Approved remote support response did not contain a valid expiry.",
        );
      }

      console.log(
        "[Remote Support] User approved session " +
          request.sessionId,
      );

      if (onApproved) {
        await onApproved({
          sessionId:
            request.sessionId,

          endpointToken,

          expiresAt,

          capabilities:
            request.capabilities,
        });
      }

      return true;
    } catch (error) {
      console.error(
        "[Remote Support] Consent response failed:",
        error,
      );

      return false;
    }
  }

  async function poll():
    Promise<void> {
    if (
      stopped ||
      polling
    ) {
      return;
    }

    polling =
      true;

    try {
      const pending =
        await api
          .getPending();

      const requests =
        pending
          ?.requests;

      if (
        !Array.isArray(
          requests,
        )
      ) {
        throw new Error(
          "Remote support pending response did not contain requests.",
        );
      }

      for (
        const item of
          requests
      ) {
        if (
          stopped
        ) {
          return;
        }

        if (
          typeof item !==
            "object" ||
          item === null ||
          Array.isArray(
            item,
          )
        ) {
          continue;
        }

        const request =
          item as
            RemoteSupportRequest;

        if (
          typeof request.sessionId !==
            "string" ||
          !request.sessionId ||
          completedSessions.has(
            request.sessionId,
          )
        ) {
          continue;
        }

        const expiry =
          Date.parse(
            request.expiresAt,
          );

        if (
          Number.isFinite(
            expiry,
          ) &&
          expiry <=
            Date.now()
        ) {
          continue;
        }

        let decision =
          pendingDecisions.get(
            request.sessionId,
          );

        if (!decision) {
          console.log(
            "[Remote Support] Consent requested for session " +
              request.sessionId,
          );

          decision =
            await requestConsent(
              request,
            );

          pendingDecisions.set(
            request.sessionId,
            decision,
          );
        }

        const submitted =
          await submitDecision(
            request,
            decision,
          );

        if (
          submitted
        ) {
          pendingDecisions.delete(
            request.sessionId,
          );

          completedSessions.add(
            request.sessionId,
          );
        }
      }
    } catch (error) {
      console.error(
        "[Remote Support] Pending request check failed:",
        error,
      );
    } finally {
      polling =
        false;
    }
  }

  void poll();

  const timer =
    setInterval(
      () => {
        void poll();
      },
      POLL_INTERVAL_MS,
    );

  return () => {
    stopped =
      true;

    clearInterval(
      timer,
    );

    pendingDecisions.clear();
    completedSessions.clear();
  };
}


