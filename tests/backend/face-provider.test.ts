import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

type Rgb = [number, number, number];

function chunk(type: string, data: Buffer) {
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  output.write(type, 4, 4, "ascii");
  data.copy(output, 8);
  output.writeUInt32BE(0, 8 + data.length);
  return output;
}

function makeSyntheticFacePng({
  face = [186, 132, 96],
  offsetX = 0,
  offsetY = 0,
  secondFace = false,
}: {
  face?: Rgb;
  offsetX?: number;
  offsetY?: number;
  secondFace?: boolean;
} = {}) {
  const width = 192;
  const height = 192;
  const rgba = Buffer.alloc(width * height * 4);
  const background: Rgb = [232, 236, 238];
  const hair: Rgb = [45, 35, 32];
  const feature: Rgb = [28, 24, 22];

  function paintPixel(x: number, y: number, color: Rgb) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = (y * width + x) * 4;
    rgba[index] = color[0];
    rgba[index + 1] = color[1];
    rgba[index + 2] = color[2];
    rgba[index + 3] = 255;
  }

  function paintOval(cx: number, cy: number, rx: number, ry: number, color: Rgb) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const normalized = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2);
        if (normalized <= 1) paintPixel(x, y, color);
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const noise = (x * 13 + y * 7) % 9;
      paintPixel(x, y, [background[0] - noise, background[1] - noise, background[2] - noise]);
    }
  }

  const cx = 96 + offsetX;
  const cy = 98 + offsetY;
  paintOval(cx, cy - 34, 42, 28, hair);
  paintOval(cx, cy, 38, 52, face);
  paintOval(cx - 14, cy - 10, 4, 3, feature);
  paintOval(cx + 14, cy - 10, 4, 3, feature);
  paintOval(cx, cy + 18, 16, 3, feature);
  paintOval(cx, cy + 2, 5, 12, [Math.max(face[0] - 25, 0), Math.max(face[1] - 20, 0), Math.max(face[2] - 18, 0)]);

  if (secondFace) {
    paintOval(42, 96, 26, 38, [170, 118, 88]);
    paintOval(34, 88, 3, 2, feature);
    paintOval(50, 88, 3, 2, feature);
  }

  const scanlines: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    scanlines.push(Buffer.from([0]));
    scanlines.push(rgba.subarray(y * width * 4, (y + 1) * width * 4));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(scanlines))),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${png.toString("base64")}`;
}

test("local face provider enrolls a protected template and verifies matching synthetic face data", async () => {
  const { faceRecognitionProvider } = await import("../../backend/src/services/face-recognition-provider.ts");
  const { encryptSecret } = await import("../../backend/src/utils/crypto.ts");

  const enrollment = await faceRecognitionProvider.enroll([
    makeSyntheticFacePng({ offsetX: 0 }),
    makeSyntheticFacePng({ offsetX: 1 }),
    makeSyntheticFacePng({ offsetX: -1, offsetY: 1 }),
  ]);

  assert.equal(enrollment.provider, "local-private-visual-face-template");
  assert.equal(enrollment.qualityChecks.every((check) => check.facePresent && check.singleFace), true);
  assert.equal(enrollment.template.includes("data:image/"), false);

  const matching = await faceRecognitionProvider.verify(
    makeSyntheticFacePng({ offsetX: 2, offsetY: -1 }),
    encryptSecret(enrollment.template),
  );

  assert.equal(matching.matched, true);
  assert.equal(matching.livenessPassed, true);
});

test("local face provider rejects invalid face geometry and replayed captures", async () => {
  const { faceRecognitionProvider } = await import("../../backend/src/services/face-recognition-provider.ts");
  const { encryptSecret } = await import("../../backend/src/utils/crypto.ts");

  await assert.rejects(
    () =>
      faceRecognitionProvider.enroll([
        makeSyntheticFacePng({ secondFace: true }),
        makeSyntheticFacePng({ secondFace: true, offsetX: -48 }),
        makeSyntheticFacePng({ secondFace: true, offsetX: -52 }),
      ]),
    /exactly one face|centered face/,
  );

  const sample = makeSyntheticFacePng({ offsetX: 0 });
  const enrollment = await faceRecognitionProvider.enroll([
    sample,
    makeSyntheticFacePng({ offsetX: 1 }),
    makeSyntheticFacePng({ offsetX: -1 }),
  ]);
  const replay = await faceRecognitionProvider.verify(sample, encryptSecret(enrollment.template));

  assert.equal(replay.matched, true);
  assert.equal(replay.livenessPassed, false);
});
