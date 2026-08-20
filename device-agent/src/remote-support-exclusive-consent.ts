import {
  execFile,
} from "node:child_process";

import path from "node:path";

import {
  promisify,
} from "node:util";

const execFileAsync =
  promisify(
    execFile,
  );

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

export async function requestRemoteSupportExclusiveControlConsent():
  Promise<boolean> {
  if (
    process.platform !==
      "win32"
  ) {
    return false;
  }

  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$message = 'An authorized AI BOS administrator is requesting Exclusive Control.' + [Environment]::NewLine + [Environment]::NewLine + 'If you allow this request, your local mouse and keyboard will be temporarily disabled while the remote administrator controls this computer.' + [Environment]::NewLine + [Environment]::NewLine + 'Local input will be restored when Exclusive Control is released, the remote session ends, the connection fails, or the session helper exits. Ctrl+Alt+Del remains a Windows safety escape.' + [Environment]::NewLine + [Environment]::NewLine + 'Screen recording remains OFF.'",
    "$result = [System.Windows.Forms.MessageBox]::Show($message, 'AI BOS Exclusive Control Request', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Warning, [System.Windows.Forms.MessageBoxDefaultButton]::Button2)",
    "if ($result -eq [System.Windows.Forms.DialogResult]::Yes) { Write-Output 'ALLOW' } else { Write-Output 'DECLINE' }",
  ].join(
    ";",
  );

  try {
    const result =
      await execFileAsync(
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

          timeout:
            120_000,

          maxBuffer:
            128 * 1024,
        },
      );

    return result.stdout
      .trim()
      .includes(
        "ALLOW",
      );
  } catch (
    error
  ) {
    console.error(
      "[Remote Support] Exclusive Control consent failed:",
      error,
    );

    return false;
  }
}
