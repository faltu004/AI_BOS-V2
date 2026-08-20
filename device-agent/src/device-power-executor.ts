import koffi from "koffi";

export type DevicePowerCommandType =
  | "RESTART_DEVICE"
  | "SHUTDOWN_DEVICE";

export type DevicePowerCommandPayload = {
  reason: string;
  delaySeconds: number;
};

export type DevicePowerCommandResult = {
  accepted: true;
  action: DevicePowerCommandType;
  reason: string;
  delaySeconds: number;
  forceAppsClosed: false;
  initiatedAt: string;
};

type WindowsPowerApi = {
  GetCurrentProcess: () => unknown;
  GetLastError: () => number;
  SetLastError: (errorCode: number) => void;
  CloseHandle: (handle: unknown) => number;

  OpenProcessToken: (
    processHandle: unknown,
    desiredAccess: number,
    tokenHandle: unknown[],
  ) => number;

  LookupPrivilegeValueW: (
    systemName: null,
    privilegeName: string,
    luid: Record<string, unknown>,
  ) => number;

  AdjustTokenPrivileges: (
    tokenHandle: unknown,
    disableAllPrivileges: number,
    newState: unknown,
    bufferLength: number,
    previousState: unknown,
    returnLength: unknown,
  ) => number;

  InitiateSystemShutdownExW: (
    machineName: null,
    message: string,
    timeoutSeconds: number,
    forceAppsClosed: number,
    rebootAfterShutdown: number,
    reasonCode: number,
  ) => number;

  tokenPrivilegesSize: number;
};

let windowsPowerApi: WindowsPowerApi | null = null;

const TOKEN_QUERY =
  0x0008;

const TOKEN_ADJUST_PRIVILEGES =
  0x0020;

const SE_PRIVILEGE_ENABLED =
  0x00000002;

const ERROR_SUCCESS =
  0;

const ERROR_NOT_ALL_ASSIGNED =
  1300;

const SHTDN_REASON_MAJOR_APPLICATION =
  0x00040000;

const SHTDN_REASON_MINOR_MAINTENANCE =
  0x00000001;

const SHTDN_REASON_FLAG_PLANNED =
  0x80000000;

const plannedMaintenanceReason =
  SHTDN_REASON_FLAG_PLANNED +
  SHTDN_REASON_MAJOR_APPLICATION +
  SHTDN_REASON_MINOR_MAINTENANCE;

function normalizePowerPayload(
  value: DevicePowerCommandPayload,
): DevicePowerCommandPayload {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid device power payload",
    );
  }

  const reason =
    typeof value.reason === "string"
      ? value.reason.trim()
      : "";

  if (
    reason.length < 3 ||
    reason.length > 200
  ) {
    throw new Error(
      "Device power reason must be between 3 and 200 characters",
    );
  }

  if (
    /[\u0000-\u001F\u007F]/.test(
      reason,
    )
  ) {
    throw new Error(
      "Device power reason contains unsupported control characters",
    );
  }

  const delaySeconds =
    value.delaySeconds;

  if (
    typeof delaySeconds !== "number" ||
    !Number.isInteger(delaySeconds) ||
    delaySeconds < 60 ||
    delaySeconds > 3600
  ) {
    throw new Error(
      "Device power delaySeconds must be an integer between 60 and 3600",
    );
  }

  return {
    reason,
    delaySeconds,
  };
}

function getWindowsPowerApi():
  WindowsPowerApi {
  if (
    process.platform !== "win32"
  ) {
    throw new Error(
      "Device power actions are supported only on Windows",
    );
  }

  if (windowsPowerApi) {
    return windowsPowerApi;
  }

  const kernel32 =
    koffi.load(
      "kernel32.dll",
    );

  const advapi32 =
    koffi.load(
      "advapi32.dll",
    );

  const HANDLE =
    koffi.pointer(
      "AIBOS_HANDLE",
      koffi.opaque(),
    );

  const LUID =
    koffi.struct(
      "AIBOS_LUID",
      {
        LowPart:
          "uint32_t",
        HighPart:
          "int32_t",
      },
    );

  const LUID_AND_ATTRIBUTES =
    koffi.struct(
      "AIBOS_LUID_AND_ATTRIBUTES",
      {
        Luid:
          LUID,
        Attributes:
          "uint32_t",
      },
    );

  const TOKEN_PRIVILEGES =
    koffi.struct(
      "AIBOS_TOKEN_PRIVILEGES",
      {
        PrivilegeCount:
          "uint32_t",

        Privileges:
          koffi.array(
            LUID_AND_ATTRIBUTES,
            1,
          ),
      },
    );

  const GetCurrentProcess =
    kernel32.func(
      "AIBOS_HANDLE __stdcall GetCurrentProcess()",
    );

  const GetLastError =
    kernel32.func(
      "uint32_t __stdcall GetLastError()",
    );

  const SetLastError =
    kernel32.func(
      "void __stdcall SetLastError(uint32_t dwErrCode)",
    );

  const CloseHandle =
    kernel32.func(
      "int __stdcall CloseHandle(AIBOS_HANDLE hObject)",
    );

  const OpenProcessToken =
    advapi32.func(
      "int __stdcall OpenProcessToken(" +
      "AIBOS_HANDLE ProcessHandle, " +
      "uint32_t DesiredAccess, " +
      "_Out_ AIBOS_HANDLE *TokenHandle" +
      ")",
    );

  const LookupPrivilegeValueW =
    advapi32.func(
      "int __stdcall LookupPrivilegeValueW(" +
      "const char16_t *lpSystemName, " +
      "const char16_t *lpName, " +
      "_Out_ AIBOS_LUID *lpLuid" +
      ")",
    );

  const AdjustTokenPrivileges =
    advapi32.func(
      "int __stdcall AdjustTokenPrivileges(" +
      "AIBOS_HANDLE TokenHandle, " +
      "int DisableAllPrivileges, " +
      "const AIBOS_TOKEN_PRIVILEGES *NewState, " +
      "uint32_t BufferLength, " +
      "_Out_ AIBOS_TOKEN_PRIVILEGES *PreviousState, " +
      "_Out_ uint32_t *ReturnLength" +
      ")",
    );

  const InitiateSystemShutdownExW =
    advapi32.func(
      "__stdcall",
      "InitiateSystemShutdownExW",
      "int",
      [
        "void *",
        "str16",
        "uint32_t",
        "int",
        "int",
        "uint32_t",
      ],
    );

  windowsPowerApi = {
    GetCurrentProcess,
    GetLastError,
    SetLastError,
    CloseHandle,
    OpenProcessToken,
    LookupPrivilegeValueW,
    AdjustTokenPrivileges,
    InitiateSystemShutdownExW,

    tokenPrivilegesSize:
      koffi.sizeof(
        TOKEN_PRIVILEGES,
      ),
  };

  return windowsPowerApi;
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

function enableShutdownPrivilege():
  () => void {
  const api =
    getWindowsPowerApi();

  const tokenHandleOut:
    unknown[] =
    [null];

  const desiredAccess =
    TOKEN_QUERY |
    TOKEN_ADJUST_PRIVILEGES;

  if (
    api.OpenProcessToken(
      api.GetCurrentProcess(),
      desiredAccess,
      tokenHandleOut,
    ) === 0
  ) {
    throw win32Failure(
      "OpenProcessToken",
      api.GetLastError(),
    );
  }

  const tokenHandle =
    tokenHandleOut[0];

  let ownershipTransferred =
    false;

  try {
    const luid:
      Record<string, unknown> =
      {};

    if (
      api.LookupPrivilegeValueW(
        null,
        "SeShutdownPrivilege",
        luid,
      ) === 0
    ) {
      throw win32Failure(
        "LookupPrivilegeValueW(SeShutdownPrivilege)",
        api.GetLastError(),
      );
    }

    const newState = {
      PrivilegeCount:
        1,

      Privileges:
        [
          {
            Luid: {
              LowPart:
                luid.LowPart,

              HighPart:
                luid.HighPart,
            },

            Attributes:
              SE_PRIVILEGE_ENABLED,
          },
        ],
    };

    const previousState:
      Record<string, unknown> =
      {};

    const returnLength:
      unknown[] =
      [0];

    /*
     * AdjustTokenPrivileges may return non-zero
     * while GetLastError reports
     * ERROR_NOT_ALL_ASSIGNED.
     *
     * Clear the thread error first so the result
     * can be checked reliably.
     */
    api.SetLastError(
      ERROR_SUCCESS,
    );

    const adjusted =
      api.AdjustTokenPrivileges(
        tokenHandle,
        0,
        newState,
        api.tokenPrivilegesSize,
        previousState,
        returnLength,
      );

    const adjustError =
      api.GetLastError();

    if (adjusted === 0) {
      throw win32Failure(
        "AdjustTokenPrivileges(SeShutdownPrivilege)",
        adjustError,
      );
    }

    if (
      adjustError ===
      ERROR_NOT_ALL_ASSIGNED
    ) {
      throw new Error(
        "Process token does not contain SeShutdownPrivilege " +
        "(Win32 error 1300)",
      );
    }

    if (
      adjustError !==
      ERROR_SUCCESS
    ) {
      throw win32Failure(
        "AdjustTokenPrivileges(SeShutdownPrivilege)",
        adjustError,
      );
    }

    ownershipTransferred =
      true;

    let restored =
      false;

    return () => {
      if (restored) {
        return;
      }

      restored =
        true;

      /*
       * Best-effort privilege restoration.
       *
       * Never turn a successfully scheduled
       * restart into a failed command merely
       * because privilege restoration reports
       * an error.
       */
      try {
        api.AdjustTokenPrivileges(
          tokenHandle,
          0,
          previousState,
          0,
          null,
          null,
        );
      }
      finally {
        api.CloseHandle(
          tokenHandle,
        );
      }
    };
  }
  finally {
    if (
      !ownershipTransferred &&
      tokenHandle
    ) {
      api.CloseHandle(
        tokenHandle,
      );
    }
  }
}

export async function executeDevicePowerCommand(
  type: DevicePowerCommandType,
  payloadInput: DevicePowerCommandPayload,
): Promise<DevicePowerCommandResult> {
  if (
    type !== "RESTART_DEVICE" &&
    type !== "SHUTDOWN_DEVICE"
  ) {
    throw new Error(
      "Unsupported device power command type",
    );
  }

  const payload =
    normalizePowerPayload(
      payloadInput,
    );

  const actionLabel =
    type === "RESTART_DEVICE"
      ? "restart"
      : "shutdown";

  const message =
    "AI BOS administrator scheduled a " +
    actionLabel +
    ". Reason: " +
    payload.reason;

  const rebootAfterShutdown =
    type === "RESTART_DEVICE"
      ? 1
      : 0;

  /*
   * Safety:
   *
   * bForceAppsClosed remains FALSE.
   * No shell, PowerShell, cmd.exe or arbitrary
   * executable arguments are accepted.
   */
  const api =
    getWindowsPowerApi();

  const restoreShutdownPrivilege =
    enableShutdownPrivilege();

  try {
    const accepted =
      api.InitiateSystemShutdownExW(
        null,
        message,
        payload.delaySeconds,
        0,
        rebootAfterShutdown,
        plannedMaintenanceReason,
      );

    if (accepted === 0) {
      const errorCode =
        api.GetLastError();

      throw new Error(
        "Windows rejected the requested device power action " +
        "(Win32 error " +
        errorCode +
        ")",
      );
    }

    return {
      accepted:
        true,

      action:
        type,

      reason:
        payload.reason,

      delaySeconds:
        payload.delaySeconds,

      forceAppsClosed:
        false,

      initiatedAt:
        new Date().toISOString(),
    };
  }
  finally {
    restoreShutdownPrivilege();
  }
}
