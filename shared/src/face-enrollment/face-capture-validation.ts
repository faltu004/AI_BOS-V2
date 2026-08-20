export type FaceBox = readonly [number, number, number, number];

export type FrameDimensions = {
  width: number;
  height: number;
};

export type FaceCropGeometry = {
  faceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  faceCenter: {
    x: number;
    y: number;
  };
  frameCenter: {
    x: number;
    y: number;
  };
  frameCenterOffsetPct: {
    x: number;
    y: number;
  };
  faceSizePct: number;
  crop: {
    x: number;
    y: number;
    size: number;
  };
  cropCenterOffsetPct: {
    x: number;
    y: number;
  };
};

export type CenteredFaceValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

const cropPadding = 1.6;
const maxFrameOffsetX = 0.2;
const maxFrameOffsetY = 0.24;
const maxCropOffsetX = 0.2;
const maxCropOffsetY = 0.22;

function clamp(value: number, minimum: number, maximum: number) {
  if (maximum < minimum) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number) {
  return Number(value.toFixed(3));
}

function directionGuidance(offsetX: number, offsetY: number) {
  if (Math.abs(offsetX) >= Math.abs(offsetY)) {
    /*
     * The preview is mirrored with CSS, while Human reports raw video
     * coordinates. Invert horizontal guidance so "left/right" matches what
     * the user sees on screen.
     */
    return offsetX < 0 ? "Move slightly left." : "Move slightly right.";
  }

  return offsetY < 0 ? "Move slightly down." : "Move slightly up.";
}

export function getFaceCropGeometry(frame: FrameDimensions, box: FaceBox): FaceCropGeometry {
  const [x, y, width, height] = box;
  const faceCenter = {
    x: x + width / 2,
    y: y + height / 2,
  };
  const frameCenter = {
    x: frame.width / 2,
    y: frame.height / 2,
  };
  const requestedCropSize = Math.max(width, height) * cropPadding;
  const cropSize = Math.min(requestedCropSize, frame.width, frame.height);
  const crop = {
    x: clamp(faceCenter.x - cropSize / 2, 0, frame.width - cropSize),
    y: clamp(faceCenter.y - cropSize / 2, 0, frame.height - cropSize),
    size: cropSize,
  };
  const frameCenterOffset = {
    x: frame.width > 0 ? (faceCenter.x - frameCenter.x) / frame.width : 0,
    y: frame.height > 0 ? (faceCenter.y - frameCenter.y) / frame.height : 0,
  };
  const cropCenterOffset = {
    x: crop.size > 0 ? (faceCenter.x - (crop.x + crop.size / 2)) / crop.size : 0,
    y: crop.size > 0 ? (faceCenter.y - (crop.y + crop.size / 2)) / crop.size : 0,
  };

  return {
    faceBox: {
      x: round(x),
      y: round(y),
      width: round(width),
      height: round(height),
    },
    faceCenter: {
      x: round(faceCenter.x),
      y: round(faceCenter.y),
    },
    frameCenter: {
      x: round(frameCenter.x),
      y: round(frameCenter.y),
    },
    frameCenterOffsetPct: {
      x: round(frameCenterOffset.x * 100),
      y: round(frameCenterOffset.y * 100),
    },
    faceSizePct: round((Math.min(width, height) / Math.min(frame.width, frame.height)) * 100),
    crop: {
      x: round(crop.x),
      y: round(crop.y),
      size: round(crop.size),
    },
    cropCenterOffsetPct: {
      x: round(cropCenterOffset.x * 100),
      y: round(cropCenterOffset.y * 100),
    },
  };
}

export function validateCenteredFaceGeometry(geometry: FaceCropGeometry): CenteredFaceValidationResult {
  const frameOffsetX = geometry.frameCenterOffsetPct.x / 100;
  const frameOffsetY = geometry.frameCenterOffsetPct.y / 100;
  const cropOffsetX = geometry.cropCenterOffsetPct.x / 100;
  const cropOffsetY = geometry.cropCenterOffsetPct.y / 100;

  if (Math.abs(frameOffsetX) > maxFrameOffsetX || Math.abs(frameOffsetY) > maxFrameOffsetY) {
    return {
      ok: false,
      reason: `Face is not centered. ${directionGuidance(frameOffsetX, frameOffsetY)}`,
    };
  }

  if (Math.abs(cropOffsetX) > maxCropOffsetX || Math.abs(cropOffsetY) > maxCropOffsetY) {
    return {
      ok: false,
      reason: `Face is too close to the frame edge. ${directionGuidance(cropOffsetX, cropOffsetY)}`,
    };
  }

  return {
    ok: true,
  };
}
