import test from "node:test";
import assert from "node:assert/strict";

import {
  remoteFrameToImageSource,
} from "../../admin/src/admin/features/monitoring/remote-support-frame.ts";

test("Admin remote frame handler updates the renderer source only for valid JPEG payloads", () => {
  const capturedAt =
    new Date().toISOString();

  assert.equal(
    remoteFrameToImageSource({
      mimeType:
        "image/jpeg",
      data:
        "dGVzdC1mcmFtZQ==",
      capturedAt,
    }),
    "data:image/jpeg;base64,dGVzdC1mcmFtZQ==",
  );

  assert.equal(
    remoteFrameToImageSource({
      mimeType:
        "image/png",
      data:
        "dGVzdA==",
      capturedAt,
    }),
    null,
  );

  assert.equal(
    remoteFrameToImageSource({
      mimeType:
        "image/jpeg",
      data:
        "not base64",
      capturedAt,
    }),
    null,
  );
});
