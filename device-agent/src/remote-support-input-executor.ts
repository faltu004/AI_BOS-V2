import koffi from "koffi";

import type {
  RemoteSupportInputEvent,
} from "./remote-support-transport.js";

type StartInputExecutorOptions = {
  isAuthorized:
    () => boolean;
};

export type RemoteSupportInputExecutor = {
  handle: (
    event:
      RemoteSupportInputEvent,
  ) => void;

  setExclusiveControl: (
    enabled: boolean,
  ) => boolean;

  isExclusiveControlActive:
    () => boolean;

  stop:
    () => void;
};

const INPUT_MOUSE =
  0;

const INPUT_KEYBOARD =
  1;

const MOUSEEVENTF_MOVE =
  0x0001;

const MOUSEEVENTF_LEFTDOWN =
  0x0002;

const MOUSEEVENTF_LEFTUP =
  0x0004;

const MOUSEEVENTF_RIGHTDOWN =
  0x0008;

const MOUSEEVENTF_RIGHTUP =
  0x0010;

const MOUSEEVENTF_WHEEL =
  0x0800;

const MOUSEEVENTF_ABSOLUTE =
  0x8000;

const KEYEVENTF_EXTENDEDKEY =
  0x0001;

const KEYEVENTF_KEYUP =
  0x0002;

const MOUSEINPUT =
  koffi.struct(
    "AIBOS_REMOTE_MOUSEINPUT",
    {
      dx:
        "long",

      dy:
        "long",

      mouseData:
        "uint32_t",

      dwFlags:
        "uint32_t",

      time:
        "uint32_t",

      dwExtraInfo:
        "uintptr_t",
    },
  );

const KEYBDINPUT =
  koffi.struct(
    "AIBOS_REMOTE_KEYBDINPUT",
    {
      wVk:
        "uint16_t",

      wScan:
        "uint16_t",

      dwFlags:
        "uint32_t",

      time:
        "uint32_t",

      dwExtraInfo:
        "uintptr_t",
    },
  );

const HARDWAREINPUT =
  koffi.struct(
    "AIBOS_REMOTE_HARDWAREINPUT",
    {
      uMsg:
        "uint32_t",

      wParamL:
        "uint16_t",

      wParamH:
        "uint16_t",
    },
  );

const INPUT_UNION =
  koffi.union({
    mi:
      MOUSEINPUT,

    ki:
      KEYBDINPUT,

    hi:
      HARDWAREINPUT,
  });

const INPUT =
  koffi.struct(
    "AIBOS_REMOTE_INPUT",
    {
      type:
        "uint32_t",

      u:
        INPUT_UNION,
    },
  );

const user32 =
  process.platform ===
    "win32"
    ? koffi.load(
        "user32.dll",
      )
    : null;

const SendInput =
  user32
    ? user32.func(
        "unsigned int __stdcall SendInput(unsigned int cInputs, AIBOS_REMOTE_INPUT *pInputs, int cbSize)",
      )
    : null;

const BlockInput =
  user32
    ? user32.func(
        "int __stdcall BlockInput(int fBlockIt)",
      )
    : null;

const virtualKeys:
  Record<
    string,
    {
      vk: number;
      extended?: boolean;
    }
  > = {
    Enter: {
      vk: 0x0d,
    },

    Escape: {
      vk: 0x1b,
    },

    Tab: {
      vk: 0x09,
    },

    Backspace: {
      vk: 0x08,
    },

    Delete: {
      vk: 0x2e,
      extended: true,
    },

    ArrowUp: {
      vk: 0x26,
      extended: true,
    },

    ArrowDown: {
      vk: 0x28,
      extended: true,
    },

    ArrowLeft: {
      vk: 0x25,
      extended: true,
    },

    ArrowRight: {
      vk: 0x27,
      extended: true,
    },

    Home: {
      vk: 0x24,
      extended: true,
    },

    End: {
      vk: 0x23,
      extended: true,
    },

    PageUp: {
      vk: 0x21,
      extended: true,
    },

    PageDown: {
      vk: 0x22,
      extended: true,
    },

    Space: {
      vk: 0x20,
    },

    Control: {
      vk: 0x11,
    },

    Shift: {
      vk: 0x10,
    },

    Alt: {
      vk: 0x12,
    },
  };

function normalizedCoordinate(
  value: number,
): number {
  const safe =
    Math.min(
      1,
      Math.max(
        0,
        value,
      ),
    );

  return Math.round(
    safe *
      65535,
  );
}

function makeMouseMove(
  x: number,
  y: number,
) {
  return {
    type:
      INPUT_MOUSE,

    u: {
      mi: {
        dx:
          normalizedCoordinate(
            x,
          ),

        dy:
          normalizedCoordinate(
            y,
          ),

        mouseData:
          0,

        dwFlags:
          MOUSEEVENTF_MOVE |
          MOUSEEVENTF_ABSOLUTE,

        time:
          0,

        dwExtraInfo:
          0,
      },
    },
  };
}

function makeMouseButton(
  button:
    | "left"
    | "right",
  action:
    | "down"
    | "up",
) {
  let flag =
    0;

  if (
    button === "left"
  ) {
    flag =
      action === "down"
        ? MOUSEEVENTF_LEFTDOWN
        : MOUSEEVENTF_LEFTUP;
  } else {
    flag =
      action === "down"
        ? MOUSEEVENTF_RIGHTDOWN
        : MOUSEEVENTF_RIGHTUP;
  }

  return {
    type:
      INPUT_MOUSE,

    u: {
      mi: {
        dx:
          0,

        dy:
          0,

        mouseData:
          0,

        dwFlags:
          flag,

        time:
          0,

        dwExtraInfo:
          0,
      },
    },
  };
}

function makeWheel(
  delta: number,
) {
  return {
    type:
      INPUT_MOUSE,

    u: {
      mi: {
        dx:
          0,

        dy:
          0,

        mouseData:
          delta >>> 0,

        dwFlags:
          MOUSEEVENTF_WHEEL,

        time:
          0,

        dwExtraInfo:
          0,
      },
    },
  };
}

function makeKey(
  key: string,
  action:
    | "down"
    | "up",
) {
  const entry =
    virtualKeys[key];

  if (!entry) {
    return null;
  }

  let flags =
    0;

  if (
    entry.extended
  ) {
    flags |=
      KEYEVENTF_EXTENDEDKEY;
  }

  if (
    action === "up"
  ) {
    flags |=
      KEYEVENTF_KEYUP;
  }

  return {
    type:
      INPUT_KEYBOARD,

    u: {
      ki: {
        wVk:
          entry.vk,

        wScan:
          0,

        dwFlags:
          flags,

        time:
          0,

        dwExtraInfo:
          0,
      },
    },
  };
}

function validInputEvent(
  event:
    RemoteSupportInputEvent,
): boolean {
  if (
    !event ||
    typeof event !==
      "object"
  ) {
    return false;
  }

  if (
    event.type ===
      "mouse_move"
  ) {
    return (
      Number.isFinite(
        event.x,
      ) &&
      Number.isFinite(
        event.y,
      ) &&
      event.x >= 0 &&
      event.x <= 1 &&
      event.y >= 0 &&
      event.y <= 1
    );
  }

  if (
    event.type ===
      "mouse_button"
  ) {
    return (
      (
        event.button ===
          "left" ||
        event.button ===
          "right"
      ) &&
      (
        event.action ===
          "down" ||
        event.action ===
          "up"
      ) &&
      Number.isFinite(
        event.x,
      ) &&
      Number.isFinite(
        event.y,
      ) &&
      event.x >= 0 &&
      event.x <= 1 &&
      event.y >= 0 &&
      event.y <= 1
    );
  }

  if (
    event.type ===
      "mouse_wheel"
  ) {
    return (
      Number.isInteger(
        event.delta,
      ) &&
      event.delta >=
        -1200 &&
      event.delta <=
        1200
    );
  }

  if (
    event.type ===
      "key"
  ) {
    return (
      Object.hasOwn(
        virtualKeys,
        event.key,
      ) &&
      (
        event.action ===
          "down" ||
        event.action ===
          "up"
      )
    );
  }

  return false;
}

export function startRemoteSupportInputExecutor({
  isAuthorized,
}: StartInputExecutorOptions): RemoteSupportInputExecutor {
  let stopped =
    false;

  let exclusiveControlActive =
    false;

  const pressedKeys =
    new Set<string>();

  const pressedButtons =
    new Set<
      "left" |
      "right"
    >();

  if (
    process.platform !==
      "win32" ||
    !SendInput
  ) {
    return {
      handle:
        () => {},

      setExclusiveControl:
        () =>
          false,

      isExclusiveControlActive:
        () =>
          false,

      stop:
        () => {
          stopped =
            true;
        },
    };
  }

  const sendInput =
    SendInput;

  function send(
    events:
      Array<
        Record<
          string,
          unknown
        >
      >,
  ): void {
    if (
      events.length === 0
    ) {
      return;
    }

    const inserted =
      Number(
        sendInput(
          events.length,
          events,
          koffi.sizeof(
            INPUT,
          ),
        ),
      );

    if (
      inserted !==
      events.length
    ) {
      throw new Error(
        "Windows SendInput inserted " +
          inserted +
          " of " +
          events.length +
          " event(s).",
      );
    }
  }

  function execute(
    event:
      RemoteSupportInputEvent,
  ): void {
    if (
      stopped ||
      !isAuthorized()
    ) {
      return;
    }

    if (
      event.type ===
        "mouse_move"
    ) {
      send([
        makeMouseMove(
          event.x,
          event.y,
        ),
      ]);

      return;
    }

    if (
      event.type ===
        "mouse_button"
    ) {
      send([
        makeMouseMove(
          event.x,
          event.y,
        ),

        makeMouseButton(
          event.button,
          event.action,
        ),
      ]);

      if (
        event.action ===
          "down"
      ) {
        pressedButtons.add(
          event.button,
        );
      } else {
        pressedButtons.delete(
          event.button,
        );
      }

      return;
    }

    if (
      event.type ===
        "mouse_wheel"
    ) {
      send([
        makeWheel(
          event.delta,
        ),
      ]);

      return;
    }

    if (
      event.type ===
        "key"
    ) {
      const nativeEvent =
        makeKey(
          event.key,
          event.action,
        );

      if (
        !nativeEvent
      ) {
        return;
      }

      send([
        nativeEvent,
      ]);

      if (
        event.action ===
          "down"
      ) {
        pressedKeys.add(
          event.key,
        );
      } else {
        pressedKeys.delete(
          event.key,
        );
      }
    }
  }

  function releasePressedInput():
    void {
    const releaseEvents:
      Array<
        Record<
          string,
          unknown
        >
      > = [];

    for (
      const button of
        pressedButtons
    ) {
      releaseEvents.push(
        makeMouseButton(
          button,
          "up",
        ),
      );
    }

    pressedButtons.clear();

    for (
      const key of
        pressedKeys
    ) {
      const event =
        makeKey(
          key,
          "up",
        );

      if (event) {
        releaseEvents.push(
          event,
        );
      }
    }

    pressedKeys.clear();

    if (
      releaseEvents.length ===
        0
    ) {
      return;
    }

    try {
      send(
        releaseEvents,
      );
    } catch (
      error
    ) {
      console.error(
        "[Remote Support] Failed to release remote input state:",
        error,
      );
    }
  }

  function setExclusiveControl(
    enabled: boolean,
  ): boolean {
    if (
      stopped ||
      !BlockInput
    ) {
      return false;
    }

    if (!enabled) {
      if (
        !exclusiveControlActive
      ) {
        return true;
      }

      const released =
        Number(
          BlockInput(
            0,
          ),
        ) !==
        0;

      if (released) {
        exclusiveControlActive =
          false;
      }

      return released;
    }

    if (
      exclusiveControlActive
    ) {
      return true;
    }

    if (
      !isAuthorized()
    ) {
      return false;
    }

    const blocked =
      Number(
        BlockInput(
          1,
        ),
      ) !==
      0;

    exclusiveControlActive =
      blocked;

    return blocked;
  }

  const releaseExclusiveControlOnExit =
    () => {
      if (
        !exclusiveControlActive ||
        !BlockInput
      ) {
        return;
      }

      try {
        BlockInput(
          0,
        );
      } catch {
        // Windows also releases BlockInput when
        // the blocking thread terminates.
      }

      exclusiveControlActive =
        false;
    };

  process.once(
    "exit",
    releaseExclusiveControlOnExit,
  );
  return {
    handle:
      (
        event,
      ) => {
        if (
          stopped ||
          !validInputEvent(
            event,
          )
        ) {
          return;
        }

        try {
          execute(
            event,
          );
        } catch (
          error
        ) {
          console.error(
            "[Remote Support] Authorized input execution failed:",
            error,
          );
        }
      },

    setExclusiveControl,

    isExclusiveControlActive:
      () =>
        exclusiveControlActive,

    stop:
      () => {
        if (
          stopped
        ) {
          return;
        }

        releasePressedInput();

        const released =
          setExclusiveControl(
            false,
          );

        if (
          !released &&
          exclusiveControlActive
        ) {
          console.error(
            "[Remote Support] CRITICAL: Exclusive Control did not release normally. Ending Session Helper to trigger Windows safety release.",
          );

          process.exit(
            1,
          );
        }

        process.removeListener(
          "exit",
          releaseExclusiveControlOnExit,
        );

        stopped =
          true;
      },
  };
}


