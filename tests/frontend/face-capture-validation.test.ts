import test from "node:test";
import assert from "node:assert/strict";
import {
  getFaceCropGeometry,
  validateCenteredFaceGeometry,
} from "../../shared/src/face-enrollment/face-capture-validation.ts";

test("centered face geometry passes before sample counter can increment", () => {
  const geometry = getFaceCropGeometry(
    {
      width: 640,
      height: 480,
    },
    [220, 140, 200, 200],
  );

  assert.equal(validateCenteredFaceGeometry(geometry).ok, true);
  assert.equal(geometry.frameCenterOffsetPct.x, 0);
  assert.equal(geometry.frameCenterOffsetPct.y, 0);
  assert.equal(Math.abs(geometry.cropCenterOffsetPct.x) <= 1, true);
  assert.equal(Math.abs(geometry.cropCenterOffsetPct.y) <= 1, true);
});

test("off-center face geometry is rejected with directional guidance", () => {
  const leftSideRawVideoGeometry = getFaceCropGeometry(
    {
      width: 640,
      height: 480,
    },
    [32, 140, 180, 180],
  );

  const result = validateCenteredFaceGeometry(leftSideRawVideoGeometry);

  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.reason, /Move slightly left/);
});

test("crop window is clamped without shrinking away from the intended square", () => {
  const geometry = getFaceCropGeometry(
    {
      width: 640,
      height: 480,
    },
    [246, 110, 280, 280],
  );

  assert.equal(geometry.crop.size, 448);
  assert.equal(geometry.crop.x, 162);
  assert.equal(geometry.crop.y, 26);
  assert.equal(validateCenteredFaceGeometry(geometry).ok, true);
});
