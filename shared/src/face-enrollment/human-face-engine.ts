import Human, { type FaceResult } from "@vladmandic/human";
import {
  getFaceCropGeometry,
  validateCenteredFaceGeometry,
  type FaceCropGeometry,
} from "./face-capture-validation";

export type FaceLivenessChallenge = "blink" | "turn_left" | "turn_right";

export type FaceSampleQuality = {
  faceScore: number;
  real: number;
  live: number;
  faceSize: number;
  pose: { roll: number; yaw: number; pitch: number } | null;
};

export type ValidatedFaceSample = {
  embedding: number[];
  quality: FaceSampleQuality;
  diagnostics: FaceCaptureDiagnostics;
};

export type FaceLivenessEvidence = {
  challenge: FaceLivenessChallenge;
  neutralObserved: true;
  challengeObserved: true;
  returnedToCenter: true;
  durationMs: number;
  framesEvaluated: number;
  faceScoreMin: number;
  antispoofScoreMin: number;
  passiveLivenessScoreMin: number;
};

export type FaceVerificationCapture = {
  embedding: number[];
  evidence: FaceLivenessEvidence;
};

export type FaceCaptureDiagnostics = {
  videoWidth: number;
  videoHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  humanFaceCount: number;
  detectionConfidence: number;
  primaryFaceBox: FaceCropGeometry["faceBox"] | null;
  faceCenter: FaceCropGeometry["faceCenter"] | null;
  frameCenter: FaceCropGeometry["frameCenter"] | null;
  frameCenterOffsetPct: FaceCropGeometry["frameCenterOffsetPct"] | null;
  cropCenterOffsetPct: FaceCropGeometry["cropCenterOffsetPct"] | null;
  faceSizePct: number | null;
  pose: FaceSampleQuality["pose"];
  antispoofScore: number;
  livenessScore: number;
  rejectionReason?: string;
};

export class FaceCaptureValidationError extends Error {
  constructor(message: string, readonly diagnostics: FaceCaptureDiagnostics) {
    super(message);
    this.name = "FaceCaptureValidationError";
  }
}

const modelVersion = "human-3.3.6-blazeface-facemesh-faceres-antispoof-liveness";
const modelBasePath = "/models/human";
const outputSize = 320;
let humanPromise: Promise<Human> | null = null;

function getFaceEngine() {
  if (!humanPromise) {
    humanPromise = (async () => {
      const human = new Human({
        backend: "webgl",
        modelBasePath,
        async: true,
        cacheSensitivity: 0.01,
        filter: { enabled: true, equalization: true },
        face: {
          enabled: true,
          detector: { enabled: true, rotation: true, maxDetected: 3, minConfidence: 0.55, minSize: 120, return: false },
          mesh: { enabled: true },
          description: { enabled: true },
          antispoof: { enabled: true },
          liveness: { enabled: true },
          iris: { enabled: false },
          emotion: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: true },
      });
      await human.load();
      await human.warmup();
      return human;
    })();
  }
  return humanPromise;
}

export async function loadHumanFaceEngine() {
  await getFaceEngine();
}

function confidence(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function baseDiagnostics(video: HTMLVideoElement, faceCount: number, canvas?: HTMLCanvasElement): FaceCaptureDiagnostics {
  return {
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    canvasWidth: canvas?.width ?? 0,
    canvasHeight: canvas?.height ?? 0,
    humanFaceCount: faceCount,
    detectionConfidence: 0,
    primaryFaceBox: null,
    faceCenter: null,
    frameCenter: null,
    frameCenterOffsetPct: null,
    cropCenterOffsetPct: null,
    faceSizePct: null,
    pose: null,
    antispoofScore: 0,
    livenessScore: 0,
  };
}

function rejection(diagnostics: FaceCaptureDiagnostics, reason: string) {
  return new FaceCaptureValidationError(reason, { ...diagnostics, rejectionReason: reason });
}

function pose(face: FaceResult): FaceSampleQuality["pose"] {
  const angle = face.rotation?.angle;
  return angle
    ? { roll: Number(angle.roll.toFixed(3)), yaw: Number(angle.yaw.toFixed(3)), pitch: Number(angle.pitch.toFixed(3)) }
    : null;
}

function inspectFace(
  video: HTMLVideoElement,
  faces: FaceResult[],
  { requireNeutralPose, canvas }: { requireNeutralPose: boolean; canvas?: HTMLCanvasElement },
) {
  const diagnostics = baseDiagnostics(video, faces.length, canvas);
  if (faces.length === 0) throw rejection(diagnostics, "No face detected. Center your face in the camera.");
  if (faces.length > 1) throw rejection(diagnostics, "Multiple faces detected. Only one person can continue.");
  const face = faces[0];
  if (!face.box) throw rejection(diagnostics, "Face location could not be measured. Please try again.");

  const geometry = getFaceCropGeometry({ width: video.videoWidth, height: video.videoHeight }, face.box);
  diagnostics.detectionConfidence = Number(Math.max(confidence(face.score), confidence(face.faceScore), confidence(face.boxScore)).toFixed(3));
  diagnostics.primaryFaceBox = geometry.faceBox;
  diagnostics.faceCenter = geometry.faceCenter;
  diagnostics.frameCenter = geometry.frameCenter;
  diagnostics.frameCenterOffsetPct = geometry.frameCenterOffsetPct;
  diagnostics.cropCenterOffsetPct = geometry.cropCenterOffsetPct;
  diagnostics.faceSizePct = geometry.faceSizePct;
  diagnostics.antispoofScore = Number(confidence(face.real).toFixed(3));
  diagnostics.livenessScore = Number(confidence(face.live).toFixed(3));
  diagnostics.pose = pose(face);

  const centered = validateCenteredFaceGeometry(geometry);
  if (!centered.ok) throw rejection(diagnostics, centered.reason);
  const score = Math.max(confidence(face.score), confidence(face.faceScore), confidence(face.boxScore));
  if (score < 0.6) throw rejection(diagnostics, "Face quality is too low. Use a clear, well-lit camera view.");
  const faceSize = Math.min(face.box[2], face.box[3]);
  const minimumSize = Math.max(150, Math.min(video.videoWidth, video.videoHeight) * 0.28);
  const maximumSize = Math.min(video.videoWidth, video.videoHeight) * 0.72;
  if (faceSize < minimumSize) throw rejection(diagnostics, "Face is too small. Move closer to the camera.");
  if (faceSize > maximumSize) throw rejection(diagnostics, "Face is too large. Move slightly farther away.");
  if (confidence(face.real) < 0.6) throw rejection(diagnostics, "Basic anti-spoof check did not pass. Use a live camera view.");
  if (confidence(face.live) < 0.6) throw rejection(diagnostics, "Passive liveness check did not pass. Keep your face well lit and try again.");
  if (!face.embedding?.length) throw rejection(diagnostics, "Face descriptor could not be generated. Please try again.");

  const angle = face.rotation?.angle;
  if (requireNeutralPose && angle && (Math.abs(angle.roll) > 0.32 || Math.abs(angle.yaw) > 0.38 || Math.abs(angle.pitch) > 0.32)) {
    throw rejection(diagnostics, "Face the camera directly and keep your head steady.");
  }
  if (!requireNeutralPose && angle && (Math.abs(angle.roll) > 0.5 || Math.abs(angle.pitch) > 0.5 || Math.abs(angle.yaw) > 1.2)) {
    throw rejection(diagnostics, "Keep your face visible while completing the challenge.");
  }

  return {
    face,
    geometry,
    diagnostics,
    quality: {
      faceScore: Number(score.toFixed(3)),
      real: Number(confidence(face.real).toFixed(3)),
      live: Number(confidence(face.live).toFixed(3)),
      faceSize: Math.round(faceSize),
      pose: diagnostics.pose,
    } satisfies FaceSampleQuality,
  };
}

function cropFace(video: HTMLVideoElement, canvas: HTMLCanvasElement, geometry: FaceCropGeometry) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Unable to prepare face capture.");
  canvas.width = outputSize;
  canvas.height = outputSize;
  context.clearRect(0, 0, outputSize, outputSize);
  context.drawImage(video, geometry.crop.x, geometry.crop.y, geometry.crop.size, geometry.crop.size, 0, 0, outputSize, outputSize);
  return context;
}

function assertImageQuality(context: CanvasRenderingContext2D) {
  const pixels = context.getImageData(0, 0, outputSize, outputSize).data;
  let sum = 0;
  let sumSquared = 0;
  let edge = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const gray = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
    sum += gray;
    sumSquared += gray * gray;
    if (index >= 4) edge += Math.abs(gray - (pixels[index - 4] * 0.299 + pixels[index - 3] * 0.587 + pixels[index - 2] * 0.114));
  }
  const count = pixels.length / 4;
  const mean = sum / count;
  const contrast = Math.sqrt(Math.max(0, sumSquared / count - mean * mean));
  if (mean < 35 || mean > 225 || contrast < 16 || edge / count < 1.4) {
    throw new Error("Face image quality is too low. Use steady lighting and keep the camera in focus.");
  }
}

export async function captureValidatedFaceSample(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<ValidatedFaceSample> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("Camera is still loading. Please try again.");
  const result = await (await getFaceEngine()).detect(video);
  const inspected = inspectFace(video, result.face, { requireNeutralPose: true, canvas });
  const context = cropFace(video, canvas, inspected.geometry);
  try {
    assertImageQuality(context);
  } catch (error) {
    throw rejection(inspected.diagnostics, error instanceof Error ? error.message : "Face image quality is too low.");
  } finally {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  return { embedding: [...(inspected.face.embedding ?? [])], quality: inspected.quality, diagnostics: inspected.diagnostics };
}

export function getLivenessInstruction(challenge: FaceLivenessChallenge) {
  if (challenge === "blink") return "Look at the camera, blink both eyes once, then look straight ahead.";
  if (challenge === "turn_left") return "Look straight ahead, turn your head toward the left side of the preview, then return to center.";
  return "Look straight ahead, turn your head toward the right side of the preview, then return to center.";
}

export async function captureActiveLivenessVerification(
  video: HTMLVideoElement,
  challenge: FaceLivenessChallenge,
  timeoutMs: number,
  onProgress?: (message: string) => void,
): Promise<FaceVerificationCapture> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("Camera is still loading. Please try again.");
  const human = await getFaceEngine();
  const started = performance.now();
  let neutralObserved = false;
  let challengeObserved = false;
  let framesEvaluated = 0;
  let scoreMin = 1;
  let realMin = 1;
  let liveMin = 1;

  while (performance.now() - started <= Math.min(timeoutMs, 25_000)) {
    const result = await human.detect(video);
    try {
      const inspected = inspectFace(video, result.face, { requireNeutralPose: false });
      framesEvaluated += 1;
      scoreMin = Math.min(scoreMin, inspected.quality.faceScore);
      realMin = Math.min(realMin, inspected.quality.real);
      liveMin = Math.min(liveMin, inspected.quality.live);
      const gestures = result.gesture.filter((item) => "face" in item).map((item) => item.gesture);
      const centered = gestures.includes("facing center");
      const blinked = gestures.includes("blink left eye") && gestures.includes("blink right eye");
      const expectedGesture = challenge === "turn_left" ? "facing left" : "facing right";

      if (!neutralObserved) {
        if (centered && !blinked) {
          neutralObserved = true;
          onProgress?.(getLivenessInstruction(challenge));
        } else {
          onProgress?.("Start by looking straight at the camera.");
        }
      } else if (!challengeObserved) {
        if ((challenge === "blink" && blinked) || (challenge !== "blink" && gestures.includes(expectedGesture))) {
          challengeObserved = true;
          onProgress?.("Challenge detected. Return to a centered, neutral position.");
        }
      } else if (centered && !blinked && inspected.face.embedding?.length) {
        const durationMs = Math.round(performance.now() - started);
        return {
          embedding: [...inspected.face.embedding],
          evidence: {
            challenge,
            neutralObserved: true,
            challengeObserved: true,
            returnedToCenter: true,
            durationMs,
            framesEvaluated,
            faceScoreMin: Number(scoreMin.toFixed(3)),
            antispoofScoreMin: Number(realMin.toFixed(3)),
            passiveLivenessScoreMin: Number(liveMin.toFixed(3)),
          },
        };
      }
    } catch (error) {
      onProgress?.(error instanceof Error ? error.message : "Keep one face visible in the camera.");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 90));
  }
  throw new Error("Liveness challenge timed out. No attendance was recorded. Start a new attempt.");
}

export function getHumanFaceEngineVersion() {
  return modelVersion;
}
