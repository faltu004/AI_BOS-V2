import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV =
  "test";

async function waitFor(
  predicate: () => boolean,
): Promise<void> {
  const deadline =
    Date.now() + 2_000;

  while (!predicate()) {
    if (
      Date.now() >= deadline
    ) {
      throw new Error(
        "Timed out waiting for remote screen condition",
      );
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          10,
        ),
    );
  }
}

test("screen producer captures only while consented transport is ready and stops after disconnect", async () => {
  const {
    startRemoteSupportScreenProducer,
  } =
    await import(
      "../../device-agent/src/remote-support-screen-producer.ts"
    );

  let ready =
    false;
  let captureCount =
    0;
  const frames: unknown[] =
    [];

  const originalLog =
    console.log;
  console.log =
    () => undefined;

  const stop =
    startRemoteSupportScreenProducer({
      isReady:
        () => ready,
      listDisplays:
        async () => [
          {
            id: "DISPLAY1",
            name: "DISPLAY1",
            width: 1920,
            height: 1080,
            left: 0,
            top: 0,
          },
        ],
      captureScreen:
        async () => {
          captureCount +=
            1;
          return Buffer.from(
            "jpeg-frame",
          );
        },
      sendFrame:
        (frame) => {
          frames.push(
            frame,
          );
          return true;
        },
      captureIntervalMs: 10,
    });

  try {
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          40,
        ),
    );

    assert.equal(
      captureCount,
      0,
    );
    assert.equal(
      frames.length,
      0,
    );

    ready =
      true;

    await waitFor(
      () =>
        frames.length > 0,
    );

    ready =
      false;

    const disconnectedCount =
      captureCount;

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          40,
        ),
    );

    assert.equal(
      captureCount,
      disconnectedCount,
    );

    stop();
  } finally {
    stop();
    console.log =
      originalLog;
  }
});

test("screen producer rejects oversized captures before emission", async () => {
  const {
    startRemoteSupportScreenProducer,
  } =
    await import(
      "../../device-agent/src/remote-support-screen-producer.ts"
    );

  let emitted =
    false;
  const originalLog =
    console.log;
  const originalError =
    console.error;
  console.log =
    () => undefined;
  console.error =
    () => undefined;

  const stop =
    startRemoteSupportScreenProducer({
      isReady:
        () => true,
      listDisplays:
        async () => [
          {
            id: 0,
            name: "DISPLAY1",
            width: 1280,
            height: 720,
            left: 0,
            top: 0,
          },
        ],
      captureScreen:
        async () =>
          Buffer.alloc(
            4 * 1024 * 1024 +
              1,
          ),
      sendFrame:
        () => {
          emitted =
            true;
          return true;
        },
      captureIntervalMs: 10,
    });

  try {
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          40,
        ),
    );

    assert.equal(
      emitted,
      false,
    );
  } finally {
    stop();
    console.log =
      originalLog;
    console.error =
      originalError;
  }
});

test("expired endpoint transport stops and reports the end reason", async () => {
  const {
    config,
  } =
    await import(
      "../../device-agent/src/config.ts"
    );
  const {
    startRemoteSupportTransport,
  } =
    await import(
      "../../device-agent/src/remote-support-transport.ts"
    );

  config.backendUrl =
    "http://127.0.0.1:9";

  let endedReason =
    "";

  const handle =
    startRemoteSupportTransport({
      sessionId:
        "RMS-EXPIRY",
      endpointToken:
        "expired-token",
      expiresAt:
        new Date(
          Date.now() + 50,
        ).toISOString(),
      capabilities: {
        screenView: true,
        remoteControl: false,
        recording: false,
      },
      onEnded:
        (reason) => {
          endedReason =
            reason;
        },
    });

  try {
    await waitFor(
      () =>
        endedReason.length > 0,
    );

    assert.match(
      endedReason,
      /expired/i,
    );
    assert.equal(
      handle.isReady(),
      false,
    );
  } finally {
    handle.stop();
  }
});
