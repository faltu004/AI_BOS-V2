import Human, { type FaceResult } from "@vladmandic/human";
import {
  getFaceCropGeometry,
  validateCenteredFaceGeometry,
  type FaceCropGeometry,
} from "./face-capture-validation";

export type ValidatedFaceSample = {
  image: string;
  embedding: number[];
  quality: {
    faceScore: number;
    real: number;
    live: number;
    faceSize: number;
    pose: {
      roll: number;
      yaw: number;
      pitch: number;
    } | null;
  };
  diagnostics: FaceCaptureDiagnostics;
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
  pose: ValidatedFaceSample["quality"]["pose"];
  antispoofScore: number;
  livenessScore: number;
  rejectionReason?: string;
};

export class FaceCaptureValidationError extends Error {
  constructor(
    message: string,
    readonly diagnostics: FaceCaptureDiagnostics,
  ) {
    super(message);
    this.name = "FaceCaptureValidationError";
  }
};

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
          detector: {
            enabled: true,
            rotation: true,
            maxDetected: 3,
            minConfidence: 0.55,
            minSize: 120,
            return: false,
          },
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
        gesture: { enabled: false },
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

function buildBaseDiagnostics({
  video,
  canvas,
  humanFaceCount,
}: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  humanFaceCount: number;
}): FaceCaptureDiagnostics {
  return {
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    humanFaceCount,
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

function withRejection(diagnostics: FaceCaptureDiagnostics, reason: string) {
  const next = {
    ...diagnostics,
    rejectionReason: reason,
  };
  console.debug("[Face Enrollment] capture rejected", next);
  return new FaceCaptureValidationError(reason, next);
}

function assertPose(face: FaceResult, diagnostics: FaceCaptureDiagnostics) {
  const angle = face.rotation?.angle;
  if (!angle) return null;

  const normalize = (value: number, degreeLimit: number, radianLimit: number) => {
    const absolute = Math.abs(value);
    return absolute > Math.PI ? absolute <= degreeLimit : absolute <= radianLimit;
  };

  const poseOk =
    normalize(angle.roll, 18, 0.32) &&
    normalize(angle.yaw, 22, 0.38) &&
    normalize(angle.pitch, 18, 0.32);

  if (!poseOk) {
    throw withRejection(
      diagnostics,
      "Face pose is unsuitable. Face the camera directly and keep your head steady.",
    );
  }

  return {
    roll: Number(angle.roll.toFixed(3)),
    yaw: Number(angle.yaw.toFixed(3)),
    pitch: Number(angle.pitch.toFixed(3)),
  };
}

function assertOneUsableFace(
  face: FaceResult,
  source: HTMLVideoElement,
  diagnostics: FaceCaptureDiagnostics,
) {
  const score = Math.max(confidence(face.score), confidence(face.faceScore), confidence(face.boxScore));
  if (score < 0.6) {
    throw withRejection(diagnostics, "Face image quality is too low. Use a clear, well-lit camera view.");
  }

  const faceSize = Math.min(face.box?.[2] ?? 0, face.box?.[3] ?? 0);
  const requiredSize = Math.max(150, Math.min(source.videoWidth, source.videoHeight) * 0.28);
  if (faceSize < requiredSize) {
    throw withRejection(diagnostics, "Face is too small. Move closer to the camera.");
  }

  const maximumSize = Math.min(source.videoWidth, source.videoHeight) * 0.72;
  if (faceSize > maximumSize) {
    throw withRejection(diagnostics, "Face is too large. Move slightly farther away from the camera.");
  }

  const real = confidence(face.real);
  if (real < 0.6) {
    throw withRejection(diagnostics, "Anti-spoof check failed. Use a real live camera view.");
  }

  const live = confidence(face.live);
  if (live < 0.6) {
    throw withRejection(diagnostics, "Liveness check failed. Blink naturally and keep your face well lit.");
  }

  if (!face.embedding?.length) {
    throw withRejection(diagnostics, "Face descriptor could not be generated. Please try again.");
  }

  const pose = assertPose(face, diagnostics);

  return {
    faceSize,
    score,
    real,
    live,
    pose,
  };
}

function cropAlignedFace(
  source: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  geometry: FaceCropGeometry,
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Unable to prepare face capture.");
  }

  canvas.width = outputSize;
  canvas.height = outputSize;
  context.clearRect(0, 0, outputSize, outputSize);
  context.drawImage(
    source,
    geometry.crop.x,
    geometry.crop.y,
    geometry.crop.size,
    geometry.crop.size,
    0,
    0,
    outputSize,
    outputSize,
  );
  return context;
}

function assertImageQuality(context: CanvasRenderingContext2D) {
  const image = context.getImageData(0, 0, outputSize, outputSize);
  const pixels = image.data;
  let sum = 0;
  let sumSquared = 0;
  let edge = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const gray = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
    sum += gray;
    sumSquared += gray * gray;
    if (index >= 4) {
      const previous = pixels[index - 4] * 0.299 + pixels[index - 3] * 0.587 + pixels[index - 2] * 0.114;
      edge += Math.abs(gray - previous);
    }
  }

  const count = pixels.length / 4;
  const mean = sum / count;
  const variance = sumSquared / count - mean * mean;
  const contrast = Math.sqrt(Math.max(0, variance));
  const sharpness = edge / count;

  if (mean < 35 || mean > 225 || contrast < 16 || sharpness < 1.4) {
    throw new Error("Face image quality is too low. Use steady lighting and keep the camera in focus.");
  }
}

export async function captureValidatedFaceSample(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<ValidatedFaceSample> {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("Camera is still loading. Please try again.");
  }

  const human = await getFaceEngine();
  const result = await human.detect(video);
  const diagnostics = buildBaseDiagnostics({
    video,
    canvas,
    humanFaceCount: result.face.length,
  });

  if (result.face.length === 0) {
    throw withRejection(diagnostics, "No face detected. Center your face in the camera.");
  }

  if (result.face.length > 1) {
    throw withRejection(diagnostics, "Multiple faces detected. Only one person can enroll at a time.");
  }

  const face = result.face[0];
  const faceBox = face.box;
  if (!faceBox) {
    throw withRejection(diagnostics, "Face location could not be measured. Please try again.");
  }

  const geometry = getFaceCropGeometry(
    {
      width: video.videoWidth,
      height: video.videoHeight,
    },
    faceBox,
  );
  diagnostics.detectionConfidence = Number(
    Math.max(confidence(face.score), confidence(face.faceScore), confidence(face.boxScore)).toFixed(3),
  );
  diagnostics.primaryFaceBox = geometry.faceBox;
  diagnostics.faceCenter = geometry.faceCenter;
  diagnostics.frameCenter = geometry.frameCenter;
  diagnostics.frameCenterOffsetPct = geometry.frameCenterOffsetPct;
  diagnostics.cropCenterOffsetPct = geometry.cropCenterOffsetPct;
  diagnostics.faceSizePct = geometry.faceSizePct;
  diagnostics.antispoofScore = Number(confidence(face.real).toFixed(3));
  diagnostics.livenessScore = Number(confidence(face.live).toFixed(3));

  const centered = validateCenteredFaceGeometry(geometry);
  if (!centered.ok) {
    throw withRejection(diagnostics, centered.reason);
  }

  const quality = assertOneUsableFace(face, video, diagnostics);
  diagnostics.pose = quality.pose;
  const context = cropAlignedFace(video, canvas, geometry);
  try {
    assertImageQuality(context);
  } catch (error) {
    throw withRejection(
      {
        ...diagnostics,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      },
      error instanceof Error ? error.message : "Face image quality is too low.",
    );
  }

  const finalDiagnostics = {
    ...diagnostics,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  };
  console.debug("[Face Enrollment] validated sample diagnostics", finalDiagnostics);

  return {
    image: canvas.toDataURL("image/png"),
    embedding: face.embedding ?? [],
    quality: {
      faceScore: Number(quality.score.toFixed(3)),
      real: Number(quality.real.toFixed(3)),
      live: Number(quality.live.toFixed(3)),
      faceSize: Math.round(quality.faceSize),
      pose: quality.pose,
    },
    diagnostics: finalDiagnostics,
  };
}

export function getHumanFaceEngineVersion() {
  return modelVersion;
}
