import screenshotDesktop from "screenshot-desktop";

export type RemoteScreenFrame = {
  mimeType: "image/jpeg";
  data: string;
  capturedAt: string;
};

type StartRemoteSupportScreenProducerOptions = {
  isReady: () => boolean;

  sendFrame: (
    frame: RemoteScreenFrame,
  ) => boolean;

  captureScreen?: (
    displayId: string | number,
  ) => Promise<Buffer>;

  listDisplays?: () => Promise<
    RemoteScreenDisplay[]
  >;

  captureIntervalMs?: number;
};

export type RemoteScreenDisplay = {
  id: string | number;
  name: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
};

const CAPTURE_INTERVAL_MS =
  1_000;

const MAX_FRAME_BYTES =
  4 * 1024 * 1024;

const DIAGNOSTIC_LOG_INTERVAL_MS =
  30_000;

function selectDisplay(
  displays: RemoteScreenDisplay[],
): RemoteScreenDisplay {
  const valid =
    displays.filter(
      (display) =>
        Number.isFinite(
          display.width,
        ) &&
        Number.isFinite(
          display.height,
        ) &&
        Number(display.width) > 0 &&
        Number(display.height) > 0,
    );

  const selected =
    valid.find(
      (display) =>
        display.left === 0 &&
        display.top === 0,
    ) ?? valid[0];

  if (!selected) {
    throw new Error(
      "No capturable interactive display was found.",
    );
  }

  return selected;
}

export function startRemoteSupportScreenProducer({
  isReady,
  sendFrame,
  captureScreen = async (
    displayId,
  ) =>
    screenshotDesktop({
      format: "jpg",
      screen: displayId,
    }),
  listDisplays = async () =>
    screenshotDesktop.listDisplays() as Promise<
      RemoteScreenDisplay[]
    >,
  captureIntervalMs =
    CAPTURE_INTERVAL_MS,
}: StartRemoteSupportScreenProducerOptions): () => void {
  let stopped =
    false;

  let capturing =
    false;

  let selectedDisplayPromise:
    Promise<RemoteScreenDisplay> |
    null =
      null;

  let lastFrameLogAt =
    0;

  let lastErrorLogAt =
    0;

  console.log(
    "[Remote Screen] Producer started",
  );

  async function getSelectedDisplay():
    Promise<RemoteScreenDisplay> {
    if (!selectedDisplayPromise) {
      selectedDisplayPromise =
        listDisplays()
          .then(
            (displays) => {
              const selected =
                selectDisplay(
                  displays,
                );

              const index =
                Math.max(
                  0,
                  displays.findIndex(
                    (display) =>
                      display.id ===
                      selected.id,
                  ),
                );

              console.log(
                "[Remote Screen] Display selected: " +
                  index +
                  ", " +
                  Number(
                    selected.width,
                  ) +
                  "x" +
                  Number(
                    selected.height,
                  ),
              );

              return selected;
            },
          )
          .catch(
            (error) => {
              selectedDisplayPromise =
                null;

              throw error;
            },
          );
    }

    return selectedDisplayPromise;
  }

  async function capture():
    Promise<void> {
    if (
      stopped ||
      capturing ||
      !isReady()
    ) {
      return;
    }

    capturing =
      true;

    try {
      const display =
        await getSelectedDisplay();

      const image =
        await captureScreen(
          display.id,
        );

      if (
        stopped ||
        !isReady()
      ) {
        return;
      }

      if (
        !Buffer.isBuffer(
          image,
        )
      ) {
        throw new Error(
          "Screen capture did not return image data.",
        );
      }

      if (
        image.length ===
          0 ||
        image.length >
          MAX_FRAME_BYTES
      ) {
        throw new Error(
          "Screen capture frame size is invalid.",
        );
      }

      const now =
        Date.now();

      if (
        lastFrameLogAt === 0 ||
        now - lastFrameLogAt >=
          DIAGNOSTIC_LOG_INTERVAL_MS
      ) {
        console.log(
          "[Remote Screen] Frame captured: " +
            image.length,
        );

        lastFrameLogAt =
          now;
      }

      sendFrame({
        mimeType:
          "image/jpeg",

        data:
          image.toString(
            "base64",
          ),

        capturedAt:
          new Date()
            .toISOString(),
      });
    } catch (error) {
      const now =
        Date.now();

      if (
        lastErrorLogAt === 0 ||
        now - lastErrorLogAt >=
          DIAGNOSTIC_LOG_INTERVAL_MS
      ) {
        console.error(
          "[Remote Support] Screen capture failed:",
          error,
        );

        lastErrorLogAt =
          now;
      }
    } finally {
      capturing =
        false;
    }
  }

  const timer =
    setInterval(
      () => {
        void capture();
      },
      captureIntervalMs,
    );

  void capture();

  return () => {
    stopped =
      true;

    clearInterval(
      timer,
    );
  };
}
