import {
  execFile,
} from "node:child_process";

import {
  promisify,
} from "node:util";

const execFileAsync =
  promisify(execFile);

export type ForegroundApplication = {
  processName: string;
  pid: number;
  capturedAt: string;
  idleSeconds?: number;
};

type PowerShellResult = {
  processName?: unknown;
  pid?: unknown;
  capturedAt?: unknown;
  idleSeconds?: unknown;
};

function stringValue(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized || null;
}

function numberValue(
  value: unknown,
): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(numeric)
  ) {
    return null;
  }

  return numeric;
}

export async function getForegroundApplication():
Promise<ForegroundApplication | null> {
  const command = [
    "$typeDefinition = @'",
    "using System;",
    "using System.Runtime.InteropServices;",
    "namespace AIBOS {",
    "  public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }",
    "  public static class ForegroundWindow {",
    "    [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();",
    "    [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);",
    "    [DllImport(\"user32.dll\")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);",
    "  }",
    "}",
    "'@",
    "Add-Type -TypeDefinition $typeDefinition",

    "$hwnd = [AIBOS.ForegroundWindow]::GetForegroundWindow()",

    "if ($hwnd -eq [IntPtr]::Zero) { return }",

    "$foregroundPid = [uint32]0",

    "[void][AIBOS.ForegroundWindow]::GetWindowThreadProcessId($hwnd, [ref]$foregroundPid)",

    "if ($foregroundPid -le 0) { return }",

    "$process = Get-Process -Id $foregroundPid -ErrorAction SilentlyContinue",

    "if ($null -eq $process) { return }",

    "$lastInput = [AIBOS.LASTINPUTINFO]::new()",

    "$lastInput.cbSize = [Runtime.InteropServices.Marshal]::SizeOf($lastInput)",

    "$idleSeconds = $null",

    "if ([AIBOS.ForegroundWindow]::GetLastInputInfo([ref]$lastInput)) {",

    "  $idleMilliseconds = ([uint32][Environment]::TickCount - $lastInput.dwTime)",

    "  $idleSeconds = [math]::Round($idleMilliseconds / 1000, 2)",

    "}",

    "[PSCustomObject]@{",

    "  processName = $process.ProcessName",

    "  pid = [int]$foregroundPid",

    "  capturedAt = (Get-Date).ToUniversalTime().ToString(\"o\")",

    "  idleSeconds = $idleSeconds",

    "} | ConvertTo-Json -Compress",
  ].join("\n");

  const result =
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        command,
      ],
      {
        windowsHide: true,
        maxBuffer:
          1024 * 1024,
        encoding: "utf8",
      },
    );

  const raw =
    String(
      result.stdout,
    ).trim();

  if (!raw) {
    return null;
  }

  const parsed =
    JSON.parse(
      raw,
    ) as PowerShellResult;

  const processName =
    stringValue(
      parsed.processName,
    );

  const pid =
    numberValue(
      parsed.pid,
    );

  const capturedAt =
    stringValue(
      parsed.capturedAt,
    );

  if (
    !processName ||
    pid === null ||
    !capturedAt
  ) {
    return null;
  }

  const idleSeconds = numberValue(
    parsed.idleSeconds,
  );

  return {
    processName,
    pid,
    capturedAt,
    ...(idleSeconds !== null
      ? { idleSeconds }
      : {}),
  };
}

async function runTest():
Promise<void> {
  console.log("");
  console.log(
    "AI BOS Foreground App Collector",
  );
  console.log(
    "Switch between apps during this 30 second test.",
  );
  console.log("");

  let lastKey = "";
  const startedAt =
    Date.now();

  while (
    Date.now() -
      startedAt <
    30_000
  ) {
    try {
      const foreground =
        await getForegroundApplication();

      if (foreground) {
        const key =
          foreground.processName +
          ":" +
          foreground.pid;

        if (
          key !== lastKey
        ) {
          console.log(
            "[Foreground]",
            foreground.processName,
            "| PID",
            foreground.pid,
            "|",
            foreground.capturedAt,
          );

          lastKey = key;
        }
      }
    } catch (error) {
      console.error(
        "Foreground collector failed:",
        error,
      );
    }

    await new Promise<void>(
      (resolve) => {
        setTimeout(
          resolve,
          2_000,
        );
      },
    );
  }

  console.log("");
  console.log(
    "Foreground collector test finished.",
  );
}

const isDirectTest =
  process.argv[1]
    ?.toLowerCase()
    .endsWith(
      "foreground-app.ts",
    ) === true &&
  process.argv.includes(
    "--test",
  );

if (
  isDirectTest
) {
  runTest().catch(
    (
      error: unknown,
    ) => {
      console.error(
        "Foreground collector failed:",
        error,
      );

      process.exitCode = 1;
    },
  );
}


