import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

function descriptor(seed = 0, shift = 0) {
  return Array.from({ length: 256 }, (_, index) => Math.sin(index * 0.071 + seed) * 0.02 + shift);
}

function sample(seed = 0) {
  return {
    embedding: descriptor(seed),
    quality: {
      faceScore: 0.93,
      real: 0.91,
      live: 0.9,
      faceSize: 220,
      pose: { roll: 0.01, yaw: 0.02, pitch: -0.01 },
    },
  };
}

test("face enrollment requires explicit consent and exactly five validated descriptors", async () => {
  const { enrollFaceSchema } = await import("../../backend/src/validation/face-enrollment.validation.ts");
  assert.equal(enrollFaceSchema.safeParse({ consentAccepted: false, samples: Array.from({ length: 5 }, () => sample()) }).success, false);
  assert.equal(enrollFaceSchema.safeParse({ consentAccepted: true, samples: Array.from({ length: 4 }, () => sample()) }).success, false);
  assert.equal(enrollFaceSchema.safeParse({ consentAccepted: true, samples: Array.from({ length: 5 }, (_, index) => sample(index * 0.001)) }).success, true);
  assert.equal(enrollFaceSchema.safeParse({ consentAccepted: true, samples: [...Array.from({ length: 4 }, () => sample()), { ...sample(), embedding: [] }] }).success, false);
});

test("FaceRes provider creates a descriptor-only encrypted 1:1 template", async () => {
  const { faceRecognitionProvider } = await import("../../backend/src/services/face-recognition-provider.ts");
  const { encryptBiometricTemplate, decryptBiometricTemplate } = await import("../../backend/src/utils/crypto.ts");
  const enrollment = await faceRecognitionProvider.enroll(Array.from({ length: 5 }, (_, index) => sample(index * 0.001)));
  assert.equal(enrollment.provider, "human-faceres-1to1");
  assert.equal(enrollment.template.includes("data:image/"), false);
  assert.equal(enrollment.template.includes("base64"), false);

  const encrypted = encryptBiometricTemplate(enrollment.template);
  assert.notEqual(encrypted, enrollment.template);
  assert.equal(decryptBiometricTemplate(encrypted), enrollment.template);
  const matching = await faceRecognitionProvider.verify(descriptor(0.0015), encrypted);
  const different = await faceRecognitionProvider.verify(descriptor(0, 5), encrypted);
  assert.equal(matching.matched, true);
  assert.equal(different.matched, false);
});

test("failed or incomplete active liveness evidence is rejected", async () => {
  const { faceLivenessEvidenceSchema } = await import("../../backend/src/validation/attendance.validation.ts");
  const evidence = {
    challenge: "blink",
    neutralObserved: true,
    challengeObserved: false,
    returnedToCenter: true,
    durationMs: 2000,
    framesEvaluated: 8,
    faceScoreMin: 0.9,
    antispoofScoreMin: 0.9,
    passiveLivenessScoreMin: 0.9,
  };
  assert.equal(faceLivenessEvidenceSchema.safeParse(evidence).success, false);
});
