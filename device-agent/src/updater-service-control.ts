import koffi from "koffi";

import {
  DEVICE_AGENT_SERVICE_NAME,
} from "./agent-update-paths.js";

export type WindowsServiceState =
  | "stopped"
  | "start_pending"
  | "stop_pending"
  | "running"
  | "other";

type ServiceStatusProcess = {
  dwServiceType?: number;
  dwCurrentState?: number;
  dwControlsAccepted?: number;
  dwWin32ExitCode?: number;
  dwServiceSpecificExitCode?: number;
  dwCheckPoint?: number;
  dwWaitHint?: number;
  dwProcessId?: number;
  dwServiceFlags?: number;
};

type WindowsServiceApi = {
  GetLastError: () => number;
  OpenSCManagerW: (
    machineName: null,
    databaseName: null,
    desiredAccess: number,
  ) => unknown;
  OpenServiceW: (
    serviceControlManager: unknown,
    serviceName: string,
    desiredAccess: number,
  ) => unknown;
  ControlService: (
    serviceHandle: unknown,
    control: number,
    status: Record<string, unknown>,
  ) => number;
  QueryServiceStatusEx: (
    serviceHandle: unknown,
    infoLevel: number,
    buffer: ServiceStatusProcess,
    bufferSize: number,
    bytesNeeded: unknown[],
  ) => number;
  StartServiceW: (
    serviceHandle: unknown,
    argc: number,
    argv: null,
  ) => number;
  CloseServiceHandle: (
    handle: unknown,
  ) => number;
  serviceStatusProcessSize: number;
};

let windowsServiceApi:
  WindowsServiceApi | null =
  null;

const SC_MANAGER_CONNECT =
  0x0001;

const SERVICE_QUERY_STATUS =
  0x0004;

const SERVICE_START =
  0x0010;

const SERVICE_STOP =
  0x0020;

const SERVICE_CONTROL_STOP =
  0x00000001;

const SC_STATUS_PROCESS_INFO =
  0;

const SERVICE_STOPPED =
  1;

const SERVICE_START_PENDING =
  2;

const SERVICE_STOP_PENDING =
  3;

const SERVICE_RUNNING =
  4;

const ERROR_SERVICE_ALREADY_RUNNING =
  1056;

const ERROR_SERVICE_NOT_ACTIVE =
  1062;

function getWindowsServiceApi():
  WindowsServiceApi {
  if (
    process.platform !== "win32"
  ) {
    throw new Error(
      "Windows service control is supported only on Windows",
    );
  }

  if (windowsServiceApi) {
    return windowsServiceApi;
  }

  const advapi32 =
    koffi.load(
      "advapi32.dll",
    );

  const kernel32 =
    koffi.load(
      "kernel32.dll",
    );

  const HANDLE =
    koffi.pointer(
      "AIBOS_SERVICE_HANDLE",
      koffi.opaque(),
    );

  const SERVICE_STATUS =
    koffi.struct(
      "AIBOS_SERVICE_STATUS",
      {
        dwServiceType:
          "uint32_t",
        dwCurrentState:
          "uint32_t",
        dwControlsAccepted:
          "uint32_t",
        dwWin32ExitCode:
          "uint32_t",
        dwServiceSpecificExitCode:
          "uint32_t",
        dwCheckPoint:
          "uint32_t",
        dwWaitHint:
          "uint32_t",
      },
    );

  const SERVICE_STATUS_PROCESS =
    koffi.struct(
      "AIBOS_SERVICE_STATUS_PROCESS",
      {
        dwServiceType:
          "uint32_t",
        dwCurrentState:
          "uint32_t",
        dwControlsAccepted:
          "uint32_t",
        dwWin32ExitCode:
          "uint32_t",
        dwServiceSpecificExitCode:
          "uint32_t",
        dwCheckPoint:
          "uint32_t",
        dwWaitHint:
          "uint32_t",
        dwProcessId:
          "uint32_t",
        dwServiceFlags:
          "uint32_t",
      },
    );

  const GetLastError =
    kernel32.func(
      "uint32_t __stdcall GetLastError()",
    );

  const OpenSCManagerW =
    advapi32.func(
      "__stdcall",
      "OpenSCManagerW",
      HANDLE,
      [
        "void *",
        "void *",
        "uint32_t",
      ],
    );

  const OpenServiceW =
    advapi32.func(
      "__stdcall",
      "OpenServiceW",
      HANDLE,
      [
        HANDLE,
        "str16",
        "uint32_t",
      ],
    );

  const ControlService =
    advapi32.func(
      "int __stdcall ControlService(" +
        "AIBOS_SERVICE_HANDLE hService, " +
        "uint32_t dwControl, " +
        "_Out_ AIBOS_SERVICE_STATUS *lpServiceStatus" +
        ")",
    );

  const QueryServiceStatusEx =
    advapi32.func(
      "int __stdcall QueryServiceStatusEx(" +
        "AIBOS_SERVICE_HANDLE hService, " +
        "uint32_t InfoLevel, " +
        "_Out_ AIBOS_SERVICE_STATUS_PROCESS *lpBuffer, " +
        "uint32_t cbBufSize, " +
        "_Out_ uint32_t *pcbBytesNeeded" +
        ")",
    );

  const StartServiceW =
    advapi32.func(
      "__stdcall",
      "StartServiceW",
      "int",
      [
        HANDLE,
        "uint32_t",
        "void *",
      ],
    );

  const CloseServiceHandle =
    advapi32.func(
      "int __stdcall CloseServiceHandle(AIBOS_SERVICE_HANDLE hSCObject)",
    );

  windowsServiceApi = {
    GetLastError,
    OpenSCManagerW,
    OpenServiceW,
    ControlService,
    QueryServiceStatusEx,
    StartServiceW,
    CloseServiceHandle,
    serviceStatusProcessSize:
      koffi.sizeof(
        SERVICE_STATUS_PROCESS,
      ),
  };

  /*
   * Keep the base SERVICE_STATUS definition alive for Koffi's registered type.
   */
  void SERVICE_STATUS;

  return windowsServiceApi;
}

function serviceStateFromCode(
  code: number | undefined,
): WindowsServiceState {
  if (code === SERVICE_STOPPED) {
    return "stopped";
  }

  if (code === SERVICE_START_PENDING) {
    return "start_pending";
  }

  if (code === SERVICE_STOP_PENDING) {
    return "stop_pending";
  }

  if (code === SERVICE_RUNNING) {
    return "running";
  }

  return "other";
}

function win32Failure(
  operation: string,
  errorCode: number,
): Error {
  return new Error(
    operation +
      " failed (Win32 error " +
      errorCode +
      ")",
  );
}

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

function openFixedAgentService(
  desiredAccess: number,
): {
  api: WindowsServiceApi;
  scmHandle: unknown;
  serviceHandle: unknown;
  close: () => void;
} {
  const api =
    getWindowsServiceApi();

  const scmHandle =
    api.OpenSCManagerW(
      null,
      null,
      SC_MANAGER_CONNECT,
    );

  if (!scmHandle) {
    throw win32Failure(
      "OpenSCManagerW",
      api.GetLastError(),
    );
  }

  let serviceHandle:
    unknown = null;

  try {
    serviceHandle =
      api.OpenServiceW(
        scmHandle,
        DEVICE_AGENT_SERVICE_NAME,
        desiredAccess,
      );

    if (!serviceHandle) {
      throw win32Failure(
        "OpenServiceW(" +
          DEVICE_AGENT_SERVICE_NAME +
          ")",
        api.GetLastError(),
      );
    }

    return {
      api,
      scmHandle,
      serviceHandle,
      close: () => {
        api.CloseServiceHandle(
          serviceHandle,
        );
        api.CloseServiceHandle(
          scmHandle,
        );
      },
    };
  } catch (
    error
  ) {
    if (serviceHandle) {
      api.CloseServiceHandle(
        serviceHandle,
      );
    }

    api.CloseServiceHandle(
      scmHandle,
    );

    throw error;
  }
}

function queryState(
  api: WindowsServiceApi,
  serviceHandle: unknown,
): WindowsServiceState {
  const status:
    ServiceStatusProcess = {};

  const bytesNeeded:
    unknown[] = [0];

  if (
    api.QueryServiceStatusEx(
      serviceHandle,
      SC_STATUS_PROCESS_INFO,
      status,
      api.serviceStatusProcessSize,
      bytesNeeded,
    ) === 0
  ) {
    throw win32Failure(
      "QueryServiceStatusEx",
      api.GetLastError(),
    );
  }

  return serviceStateFromCode(
    status.dwCurrentState,
  );
}

export function queryFixedAgentServiceStatus():
  WindowsServiceState {
  const opened =
    openFixedAgentService(
      SERVICE_QUERY_STATUS,
    );

  try {
    return queryState(
      opened.api,
      opened.serviceHandle,
    );
  }
  finally {
    opened.close();
  }
}

export async function waitForFixedAgentServiceState(
  desiredState: WindowsServiceState,
  timeoutMs: number,
): Promise<void> {
  const deadline =
    Date.now() +
    timeoutMs;

  while (Date.now() < deadline) {
    if (
      queryFixedAgentServiceStatus() ===
      desiredState
    ) {
      return;
    }

    await delay(1000);
  }

  throw new Error(
    "Timed out waiting for " +
      DEVICE_AGENT_SERVICE_NAME +
      " to become " +
      desiredState,
  );
}

export async function stopFixedAgentService(
  timeoutMs: number,
): Promise<void> {
  const opened =
    openFixedAgentService(
      SERVICE_QUERY_STATUS |
        SERVICE_STOP,
    );

  try {
    const state =
      queryState(
        opened.api,
        opened.serviceHandle,
      );

    if (state === "stopped") {
      return;
    }

    const status:
      Record<string, unknown> = {};

    const stopped =
      opened.api.ControlService(
        opened.serviceHandle,
        SERVICE_CONTROL_STOP,
        status,
      );

    if (stopped === 0) {
      const errorCode =
        opened.api.GetLastError();

      if (
        errorCode !==
        ERROR_SERVICE_NOT_ACTIVE
      ) {
        throw win32Failure(
          "ControlService(stop)",
          errorCode,
        );
      }
    }
  }
  finally {
    opened.close();
  }

  await waitForFixedAgentServiceState(
    "stopped",
    timeoutMs,
  );
}

export async function startFixedAgentService(
  timeoutMs: number,
): Promise<void> {
  const opened =
    openFixedAgentService(
      SERVICE_QUERY_STATUS |
        SERVICE_START,
    );

  try {
    const state =
      queryState(
        opened.api,
        opened.serviceHandle,
      );

    if (state === "running") {
      return;
    }

    const started =
      opened.api.StartServiceW(
        opened.serviceHandle,
        0,
        null,
      );

    if (started === 0) {
      const errorCode =
        opened.api.GetLastError();

      if (
        errorCode !==
        ERROR_SERVICE_ALREADY_RUNNING
      ) {
        throw win32Failure(
          "StartServiceW",
          errorCode,
        );
      }
    }
  }
  finally {
    opened.close();
  }

  await waitForFixedAgentServiceState(
    "running",
    timeoutMs,
  );
}
