import koffi from "koffi";
import si from "systeminformation";
import {
  execFile,
} from "node:child_process";
import {
  promisify,
} from "node:util";

const execFileAsync = promisify(execFile);

export type InstalledApplication = {
  name: string;
  version: string | null;
  publisher: string | null;
  installDate: string | null;
  scope: "machine" | "user";
  architecture: "64-bit" | "32-bit" | "user";
  source: "registry" | "unknown";
};

export type RunningApplication = {
  processName: string;
  pid: number;
  startedAt: string | null;
  cpuUsage: number | null;
  memoryBytes: number | null;
};

export type ApplicationSnapshot = {
  installedApplications: InstalledApplication[];
  runningApplications: RunningApplication[];
  collectedAt: string;
};

const WINDOWS_BACKGROUND_PROCESSES = new Set(
  [
    "aibos-device-agent",
    "aibos-session-helper",
    "aggregatorhost",
    "audiodg",
    "backgroundtaskhost",
    "conhost",
    "csrss",
    "ctfmon",
    "dwm",
    "fontdrvhost",
    "idle",
    "lsass",
    "memory compression",
    "registry",
    "runtimebroker",
    "searchhost",
    "securityhealthservice",
    "services",
    "sihost",
    "smss",
    "spoolsv",
    "startmenuexperiencehost",
    "svchost",
    "system",
    "taskhostw",
    "wininit",
    "winlogon",
    "wmiprvse",
    "wudfhost",
  ],
);

type ProcessMetric = {
  pid?: number;
  name?: string;
  started?: string;
  cpu?: number;
  memRss?: number;
  mem?: number;
};

function normalizeProcessName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\.exe$/i, "");
}

function numberValue(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

type User32WindowEnumerationBindings = {
  EnumWindows: (
    callback: (hwnd: unknown, lParam: number) => boolean,
    lParam: number,
  ) => boolean;
  IsWindowVisible: (hwnd: unknown) => boolean;
  GetWindowTextLength: (hwnd: unknown) => number;
  GetWindowThreadProcessId: (
    hwnd: unknown,
    pidOut: Array<number | null>,
  ) => number;
};

/*
 * koffi.alias/proto register named types in a process-wide registry.
 * Re-declaring the same alias on every snapshot throws
 * "Duplicate type name 'DWORD'" starting on the second call, so these
 * bindings are created exactly once per process and reused.
 */
let user32WindowEnumerationBindings: User32WindowEnumerationBindings | null = null;

function getUser32WindowEnumerationBindings(): User32WindowEnumerationBindings {
  if (user32WindowEnumerationBindings) {
    return user32WindowEnumerationBindings;
  }

  const user32 = koffi.load("user32.dll");
  const HANDLE = koffi.pointer("HANDLE", koffi.opaque());
  const HWND = koffi.alias("HWND", HANDLE);
  koffi.alias("DWORD", "uint32_t");
  const EnumWindowsProc = koffi.proto("bool __stdcall EnumWindowsProc(HWND hwnd, long lParam)");

  user32WindowEnumerationBindings = {
    EnumWindows: user32.func(
      "bool __stdcall EnumWindows(EnumWindowsProc *lpEnumFunc, long lParam)",
    ),
    IsWindowVisible: user32.func("bool __stdcall IsWindowVisible(HWND hWnd)"),
    GetWindowTextLength: user32.func("int __stdcall GetWindowTextLengthW(HWND hWnd)"),
    GetWindowThreadProcessId: user32.func(
      "DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ DWORD *lpdwProcessId)",
    ),
  };

  return user32WindowEnumerationBindings;
}

function getVisibleWindowProcessIds(): Set<number> | null {
  if (process.platform !== "win32") {
    return null;
  }

  const {
    EnumWindows,
    IsWindowVisible,
    GetWindowTextLength,
    GetWindowThreadProcessId,
  } = getUser32WindowEnumerationBindings();

  const pids = new Set<number>();

  EnumWindows((hwnd: unknown) => {
    if (!IsWindowVisible(hwnd)) {
      return true;
    }

    /*
     * Window title content is intentionally not collected. Length is used only
     * to exclude invisible/tool windows that have no user-facing caption.
     */
    if (GetWindowTextLength(hwnd) <= 0) {
      return true;
    }

    const pidPointer = [null] as Array<number | null>;
    const threadId = GetWindowThreadProcessId(hwnd, pidPointer);
    const pid = pidPointer[0];
    if (threadId && typeof pid === "number" && pid > 0) {
      pids.add(pid);
    }

    return true;
  }, 0);

  return pids;
}

async function getInstalledApplications(): Promise<InstalledApplication[]> {
  if (process.platform !== "win32") {
    return [];
  }

  const nativeArchitecture =
    process.arch === "x64" || process.arch === "arm64"
      ? "64-bit"
      : "32-bit";

  const registryRoots: Array<{
    path: string;
    scope: "machine" | "user";
    architecture: InstalledApplication["architecture"];
  }> = [
    {
      path: "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
      scope: "machine",
      architecture: nativeArchitecture,
    },
    {
      path: "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
      scope: "machine",
      architecture: "32-bit",
    },
    {
      path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
      scope: "user",
      architecture: "user",
    },
  ];

  const applications: InstalledApplication[] = [];

  for (const root of registryRoots) {
    let output: string;

    try {
      /* reg.exe reads uninstall registry keys without invoking Windows Installer. */
      const result = await execFileAsync(
        "reg.exe",
        ["query", root.path, "/s"],
        {
          windowsHide: true,
          maxBuffer: 8 * 1024 * 1024,
          encoding: "utf8",
        },
      );
      output = String(result.stdout);
    } catch {
      continue;
    }

    let current: Partial<InstalledApplication> | null = null;

    const flush = (): void => {
      if (!current?.name) {
        return;
      }

      applications.push({
        name: current.name,
        version: current.version ?? null,
        publisher: current.publisher ?? null,
        installDate: current.installDate ?? null,
        scope: root.scope,
        architecture: root.architecture,
        source: "registry",
      });
    };

    for (const line of output.split(/\r?\n/)) {
      const keyMatch = line.match(/^(HKEY_CURRENT_USER|HKEY_LOCAL_MACHINE)\\/i);
      if (keyMatch) {
        flush();
        current = {};
        continue;
      }

      const valueMatch = line.match(/^\s{4}(DisplayName|DisplayVersion|Publisher|InstallDate)\s+REG_[A-Z_]+\s*(.*)$/i);
      if (!valueMatch || !current) {
        continue;
      }

      const field = valueMatch[1]?.toLowerCase();
      const value = valueMatch[2]?.trim() || null;
      if (field === "displayname" && value) {
        current.name = value;
      } else if (field === "displayversion") {
        current.version = value;
      } else if (field === "publisher") {
        current.publisher = value;
      } else if (field === "installdate") {
        current.installDate = value;
      }
    }

    flush();
  }

  const unique = new Map<string, InstalledApplication>();
  for (const application of applications) {
    const key = [
      application.name.toLowerCase(),
      application.version ?? "",
      application.publisher ?? "",
      application.scope,
      application.architecture,
    ].join("|");
    unique.set(key, application);
  }

  return [...unique.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

async function getRunningApplications(): Promise<RunningApplication[]> {
  const visiblePids = getVisibleWindowProcessIds();
  const processInfo = await si.processes();
  const processes = processInfo.list as ProcessMetric[];

  const applications = processes.flatMap((processMetric): RunningApplication[] => {
    const pid = numberValue(processMetric.pid);
    const processName = normalizeProcessName(processMetric.name);
    if (!processName || pid === null) {
      return [];
    }

    if (visiblePids && !visiblePids.has(pid)) {
      return [];
    }

    if (!visiblePids && WINDOWS_BACKGROUND_PROCESSES.has(processName.toLowerCase())) {
      return [];
    }

    const cpuUsage = typeof processMetric.cpu === "number" ? Number(processMetric.cpu.toFixed(2)) : null;
    const memoryBytes = numberValue(processMetric.memRss ?? processMetric.mem);

    return [
      {
        processName,
        pid,
        startedAt: typeof processMetric.started === "string" && processMetric.started ? processMetric.started : null,
        cpuUsage,
        memoryBytes,
      },
    ];
  });

  const uniqueByPid = new Map<number, RunningApplication>();
  for (const app of applications) {
    uniqueByPid.set(app.pid, app);
  }

  return [...uniqueByPid.values()].sort((a, b) => a.processName.localeCompare(b.processName));
}

export async function getApplicationSnapshot(): Promise<ApplicationSnapshot> {
  const [installedApplications, runningApplications] = await Promise.all([
    getInstalledApplications(),
    getRunningApplications(),
  ]);

  return {
    installedApplications,
    runningApplications,
    collectedAt: new Date().toISOString(),
  };
}

async function runLocalTest(): Promise<void> {
  const snapshot = await getApplicationSnapshot();

  console.log("");
  console.log("AI BOS Application Collector");
  console.log("Installed applications: " + snapshot.installedApplications.length);
  console.log("Running applications: " + snapshot.runningApplications.length);
  console.log("");
  console.log("Currently running:");
  console.table(
    snapshot.runningApplications.map((app) => ({
      app: app.processName,
      pid: app.pid,
      cpu: app.cpuUsage,
      memoryMB: app.memoryBytes !== null ? Math.round(app.memoryBytes / 1024 / 1024) : null,
      startedAt: app.startedAt,
    })),
  );
}

if (process.argv.includes("--test")) {
  runLocalTest().catch((error: unknown) => {
    console.error("Application collector failed:", error);
    process.exitCode = 1;
  });
}
