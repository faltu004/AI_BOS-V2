import {
  spawn,
  type ChildProcess,
} from "node:child_process";

import path from "node:path";

type StartRemoteSupportIndicatorOptions = {
  sessionId: string;

  onDisconnect:
    () =>
      void |
      Promise<void>;
};

export type RemoteSupportIndicatorHandle = {
  stop:
    () => void;

  isVisible:
    () => boolean;
};

function powerShellPath():
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

export function startRemoteSupportIndicator({
  sessionId,
  onDisconnect,
}: StartRemoteSupportIndicatorOptions): RemoteSupportIndicatorHandle {
  let stopping =
    false;

  let visible =
    false;

  let disconnectHandled =
    false;

  async function disconnectOnce(
    reason: string,
  ): Promise<void> {
    if (
      stopping ||
      disconnectHandled
    ) {
      return;
    }

    disconnectHandled =
      true;

    visible =
      false;

    console.log(
      "[Remote Support] " +
        reason,
    );

    try {
      await onDisconnect();
    } catch (
      error
    ) {
      console.error(
        "[Remote Support] Disconnect request failed:",
        error,
      );
    }
  }

  if (
    process.platform !==
    "win32"
  ) {
    void disconnectOnce(
      "Visible session indicator unavailable.",
    );

    return {
      stop:
        () => {
          stopping =
            true;

          visible =
            false;
        },

      isVisible:
        () =>
          false,
    };
  }

  const safeSessionId =
    sessionId
      .trim()
      .slice(
        0,
        100,
      );

  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$form = New-Object System.Windows.Forms.Form",
    "$form.Text = 'AI BOS Remote Support Active'",
    "$form.Width = 440",
    "$form.Height = 210",
    "$form.StartPosition = 'CenterScreen'",
    "$form.TopMost = $true",
    "$form.ShowInTaskbar = $true",
    "$form.MaximizeBox = $false",
    "$form.MinimizeBox = $true",
    "$form.FormBorderStyle = 'FixedDialog'",
    "$label = New-Object System.Windows.Forms.Label",
    "$label.Left = 20",
    "$label.Top = 20",
    "$label.Width = 390",
    "$label.Height = 85",
    "$label.Text = 'AI BOS Remote Support is active.' + [Environment]::NewLine + [Environment]::NewLine + 'Your screen may be viewed and authorized mouse or keyboard control may be used while this indicator is visible.'",
    "$button = New-Object System.Windows.Forms.Button",
    "$button.Text = 'Disconnect Remote Support'",
    "$button.Left = 110",
    "$button.Top = 120",
    "$button.Width = 210",
    "$button.Height = 34",
    "$script:disconnectWritten = $false",
    "$button.Add_Click({",
    "  if (-not $script:disconnectWritten) {",
    "    $script:disconnectWritten = $true",
    "    Write-Output 'USER_DISCONNECT'",
    "  }",
    "  $form.Close()",
    "})",
    "$form.Controls.Add($label)",
    "$form.Controls.Add($button)",
    "$timer = New-Object System.Windows.Forms.Timer",
    "$timer.Interval = 4000",
    "$timer.Add_Tick({",
    "  $timer.Stop()",
    "  $form.TopMost = $false",
    "  $form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized",
    "})",
    "$form.Add_Shown({",
    "  $timer.Start()",
    "})",
    "$form.Add_FormClosing({",
    "  if (-not $script:disconnectWritten) {",
    "    $script:disconnectWritten = $true",
    "    Write-Output 'USER_DISCONNECT'",
    "  }",
    "})",
    "[void]$form.ShowDialog()",
  ].join(
    "\n",
  );

  let child:
    ChildProcess;

  try {
    child =
      spawn(
        powerShellPath(),
        [
          "-NoLogo",
          "-NoProfile",
          "-STA",
          "-Command",
          script,
        ],
        {
          windowsHide:
            false,

          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        },
      );
  } catch (
    error
  ) {
    console.error(
      "[Remote Support] Failed to start visible indicator:",
      error,
    );

    void disconnectOnce(
      "Visible indicator failed to start. Ending session.",
    );

    return {
      stop:
        () => {
          stopping =
            true;

          visible =
            false;
        },

      isVisible:
        () =>
          false,
    };
  }

  visible =
    true;

  console.log(
    "[Remote Support] Visible session indicator started: " +
      safeSessionId,
  );

  child.stdout?.on(
    "data",
    (
      data: Buffer,
    ) => {
      if (
        data
          .toString(
            "utf8",
          )
          .includes(
            "USER_DISCONNECT",
          )
      ) {
        void disconnectOnce(
          "Device user requested remote support disconnect.",
        );
      }
    },
  );

  child.stderr?.on(
    "data",
    (
      data: Buffer,
    ) => {
      if (stopping) {
        return;
      }

      const message =
        data
          .toString(
            "utf8",
          )
          .trim();

      if (message) {
        console.error(
          "[Remote Support] Indicator error:",
          message,
        );
      }
    },
  );

  child.on(
    "error",
    (
      error,
    ) => {
      if (stopping) {
        return;
      }

      visible =
        false;

      console.error(
        "[Remote Support] Indicator process error:",
        error,
      );

      void disconnectOnce(
        "Visible indicator failed. Ending session.",
      );
    },
  );

  child.on(
    "exit",
    () => {
      visible =
        false;

      if (
        !stopping &&
        !disconnectHandled
      ) {
        void disconnectOnce(
          "Visible indicator closed. Ending session.",
        );
      }
    },
  );

  return {
    stop:
      () => {
        if (stopping) {
          return;
        }

        stopping =
          true;

        visible =
          false;

        if (
          child.exitCode ===
            null &&
          !child.killed
        ) {
          child.kill();
        }
      },

    isVisible:
      () =>
        (
          visible &&
          !stopping
        ),
  };
}

