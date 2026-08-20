import crypto from "node:crypto";
import zlib from "node:zlib";
import { AppError } from "../utils/app-error.js";
import { decryptSecret } from "../utils/crypto.js";

export type FaceQualityCheck = {
  facePresent: boolean;
  singleFace: boolean;
  imageQuality: "pass" | "fail";
  liveness: "pass" | "fail" | "not_supported";
};

export type FaceEnrollmentTemplate = {
  provider: string;
  templateVersion: string;
  template: string;
  qualityChecks: FaceQualityCheck[];
};

export type FaceVerificationResult = {
  matched: boolean;
  livenessPassed: boolean;
  modelVersion: string;
};

export interface FaceRecognitionProvider {
  readonly name: string;
  readonly modelVersion: string;
  enroll(samples: string[]): Promise<FaceEnrollmentTemplate>;
  verify(image: string, encryptedTemplate: string): Promise<FaceVerificationResult>;
}

type DecodedImage = {
  width: number;
  height: number;
  rgba: Uint8Array;
};

type FaceAnalysis = {
  quality: FaceQualityCheck;
  feature: number[];
  imageHash: string;
  perceptualHash: string;
};

type LocalTemplate = {
  provider: string;
  templateVersion: string;
  feature: number[];
  sampleHashes: string[];
  samplePerceptualHashes: string[];
  createdAt: string;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FEATURE_SIZE = 16;
const MATCH_THRESHOLD = 0.91;
const ENROLLMENT_CONSISTENCY_THRESHOLD = 0.82;

function parsePngDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new AppError("Face image must be a PNG data URL captured by the app.", 400);
  }

  return Buffer.from(match[1], "base64");
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(dataUrl: string): DecodedImage {
  const buffer = parsePngDataUrl(dataUrl);
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new AppError("Face image is not a valid PNG.", 400);
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) {
      throw new AppError("Face image PNG is truncated.", 400);
    }

    const chunk = buffer.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
    } else if (type === "IDAT") {
      idatChunks.push(chunk);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height || bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new AppError("Face image PNG format is not supported.", 400);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const scanlineLength = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const expectedLength = (scanlineLength + 1) * height;
  if (inflated.length < expectedLength) {
    throw new AppError("Face image PNG pixel data is incomplete.", 400);
  }

  const raw = new Uint8Array(scanlineLength * height);
  let readOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[readOffset];
    readOffset += 1;
    const rowStart = y * scanlineLength;
    const previousRowStart = rowStart - scanlineLength;

    for (let x = 0; x < scanlineLength; x += 1) {
      const rawValue = inflated[readOffset + x];
      const left = x >= bytesPerPixel ? raw[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? raw[previousRowStart + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? raw[previousRowStart + x - bytesPerPixel] : 0;
      let value = rawValue;

      if (filterType === 1) value = rawValue + left;
      else if (filterType === 2) value = rawValue + up;
      else if (filterType === 3) value = rawValue + Math.floor((left + up) / 2);
      else if (filterType === 4) value = rawValue + paethPredictor(left, up, upperLeft);
      else if (filterType !== 0) throw new AppError("Face image PNG uses an unsupported filter.", 400);

      raw[rowStart + x] = value & 0xff;
    }

    readOffset += scanlineLength;
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let source = 0, target = 0; source < raw.length; source += bytesPerPixel, target += 4) {
    const alpha = colorType === 6 ? raw[source + 3] / 255 : 1;
    rgba[target] = Math.round(raw[source] * alpha + 255 * (1 - alpha));
    rgba[target + 1] = Math.round(raw[source + 1] * alpha + 255 * (1 - alpha));
    rgba[target + 2] = Math.round(raw[source + 2] * alpha + 255 * (1 - alpha));
    rgba[target + 3] = 255;
  }

  return { width, height, rgba };
}

function grayscaleAt(image: DecodedImage, x: number, y: number): number {
  const offset = (y * image.width + x) * 4;
  return image.rgba[offset] * 0.299 + image.rgba[offset + 1] * 0.587 + image.rgba[offset + 2] * 0.114;
}

function buildFeature(image: DecodedImage): number[] {
  const feature: number[] = [];
  for (let by = 0; by < FEATURE_SIZE; by += 1) {
    for (let bx = 0; bx < FEATURE_SIZE; bx += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      const x0 = Math.floor((bx * image.width) / FEATURE_SIZE);
      const x1 = Math.floor(((bx + 1) * image.width) / FEATURE_SIZE);
      const y0 = Math.floor((by * image.height) / FEATURE_SIZE);
      const y1 = Math.floor(((by + 1) * image.height) / FEATURE_SIZE);

      for (let y = y0; y < Math.max(y0 + 1, y1); y += 1) {
        for (let x = x0; x < Math.max(x0 + 1, x1); x += 1) {
          const offset = (y * image.width + x) * 4;
          r += image.rgba[offset];
          g += image.rgba[offset + 1];
          b += image.rgba[offset + 2];
          count += 1;
        }
      }

      feature.push(r / count / 255, g / count / 255, b / count / 255);
    }
  }

  return normalizeVector(feature);
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude > 0 ? vector.map((value) => Number((value / magnitude).toFixed(6))) : vector;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function averageFeature(features: number[][]): number[] {
  const average = new Array(features[0].length).fill(0) as number[];
  for (const feature of features) {
    feature.forEach((value, index) => {
      average[index] += value;
    });
  }
  return normalizeVector(average.map((value) => value / features.length));
}

function perceptualHash(feature: number[]): string {
  const mean = feature.reduce((sum, value) => sum + value, 0) / feature.length;
  const bytes: number[] = [];
  for (let i = 0; i < feature.length; i += 8) {
    let byte = 0;
    for (let bit = 0; bit < 8 && i + bit < feature.length; bit += 1) {
      if (feature[i + bit] >= mean) byte |= 1 << bit;
    }
    bytes.push(byte);
  }
  return Buffer.from(bytes).toString("base64url");
}

function hammingDistance(a: string, b: string): number {
  const left = Buffer.from(a, "base64url");
  const right = Buffer.from(b, "base64url");
  const length = Math.min(left.length, right.length);
  let distance = Math.abs(left.length - right.length) * 8;
  for (let i = 0; i < length; i += 1) {
    let value = left[i] ^ right[i];
    while (value) {
      distance += value & 1;
      value >>= 1;
    }
  }
  return distance;
}

function analyzeForeground(image: DecodedImage, grays: number[]) {
  const sampleSize = 64;
  const sampled = new Array(sampleSize * sampleSize).fill(0) as number[];
  for (let y = 0; y < sampleSize; y += 1) {
    for (let x = 0; x < sampleSize; x += 1) {
      sampled[y * sampleSize + x] = grayscaleAt(
        image,
        Math.min(image.width - 1, Math.floor((x * image.width) / sampleSize)),
        Math.min(image.height - 1, Math.floor((y * image.height) / sampleSize)),
      );
    }
  }

  const corners = [
    ...sampled.slice(0, 8),
    ...sampled.slice(sampleSize - 8, sampleSize),
    ...sampled.slice(sampleSize * (sampleSize - 1), sampleSize * (sampleSize - 1) + 8),
    ...sampled.slice(sampleSize * sampleSize - 8),
  ];
  const background = corners.reduce((sum, value) => sum + value, 0) / corners.length;
  const mean = grays.reduce((sum, value) => sum + value, 0) / grays.length;
  const std = Math.sqrt(grays.reduce((sum, value) => sum + (value - mean) ** 2, 0) / grays.length);
  const threshold = Math.max(18, std * 0.55);
  const mask = sampled.map((value) => Math.abs(value - background) >= threshold);
  const visited = new Uint8Array(mask.length);
  const components: Array<{ area: number; minX: number; maxX: number; minY: number; maxY: number }> = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    const queue = [start];
    visited[start] = 1;
    let area = 0;
    let minX = sampleSize;
    let maxX = 0;
    let minY = sampleSize;
    let maxY = 0;

    while (queue.length) {
      const index = queue.pop()!;
      const x = index % sampleSize;
      const y = Math.floor(index / sampleSize);
      area += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (const next of [index - 1, index + 1, index - sampleSize, index + sampleSize]) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
        const nx = next % sampleSize;
        if (Math.abs(nx - x) > 1) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }

    if (area >= 20) components.push({ area, minX, maxX, minY, maxY });
  }

  components.sort((a, b) => b.area - a.area);
  return components;
}

function analyzeFaceImage(dataUrl: string): FaceAnalysis {
  const image = decodePng(dataUrl);
  const grays: number[] = [];
  let edgeTotal = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const gray = grayscaleAt(image, x, y);
      grays.push(gray);
      if (x > 0) edgeTotal += Math.abs(gray - grayscaleAt(image, x - 1, y));
      if (y > 0) edgeTotal += Math.abs(gray - grayscaleAt(image, x, y - 1));
    }
  }

  const mean = grays.reduce((sum, value) => sum + value, 0) / grays.length;
  const std = Math.sqrt(grays.reduce((sum, value) => sum + (value - mean) ** 2, 0) / grays.length);
  const sharpness = edgeTotal / Math.max(1, image.width * image.height * 2);
  const components = analyzeForeground(image, grays);
  const dominant = components[0];
  const second = components[1];
  const feature = buildFeature(image);

  const imageQualityPass =
    image.width >= 160 &&
    image.height >= 160 &&
    image.width <= 1200 &&
    image.height <= 1200 &&
    image.width / image.height >= 0.75 &&
    image.width / image.height <= 1.33 &&
    mean >= 35 &&
    mean <= 225 &&
    std >= 18 &&
    sharpness >= 1.8;

  let facePresent = false;
  if (dominant) {
    const widthRatio = (dominant.maxX - dominant.minX + 1) / 64;
    const heightRatio = (dominant.maxY - dominant.minY + 1) / 64;
    const areaRatio = dominant.area / (64 * 64);
    const centerX = (dominant.minX + dominant.maxX) / 2 / 64;
    const centerY = (dominant.minY + dominant.maxY) / 2 / 64;
    facePresent =
      areaRatio >= 0.06 &&
      areaRatio <= 0.75 &&
      widthRatio >= 0.2 &&
      widthRatio <= 0.9 &&
      heightRatio >= 0.2 &&
      heightRatio <= 0.95 &&
      Math.abs(centerX - 0.5) <= 0.25 &&
      Math.abs(centerY - 0.5) <= 0.28;
  }

  const singleFace = Boolean(dominant) && (!second || second.area <= dominant.area * 0.45);

  return {
    quality: {
      facePresent,
      singleFace,
      imageQuality: imageQualityPass ? "pass" : "fail",
      liveness: "not_supported",
    },
    feature,
    imageHash: crypto.createHash("sha256").update(parsePngDataUrl(dataUrl)).digest("base64url"),
    perceptualHash: perceptualHash(feature),
  };
}

function assertQuality(analysis: FaceAnalysis): void {
  if (analysis.quality.imageQuality !== "pass") {
    throw new AppError("Face image quality is too low. Use a clear, well-lit camera capture.", 400);
  }
  if (!analysis.quality.facePresent) {
    throw new AppError("A centered face was not detected in the capture.", 400);
  }
  if (!analysis.quality.singleFace) {
    throw new AppError("Capture exactly one face.", 400);
  }
}

class LocalPrivateFaceRecognitionProvider implements FaceRecognitionProvider {
  readonly name = "local-private-visual-face-template";
  readonly modelVersion = "local-visual-template-v1-basic-pad";

  async enroll(samples: string[]): Promise<FaceEnrollmentTemplate> {
    const analyses = samples.map(analyzeFaceImage);
    analyses.forEach(assertQuality);

    const average = averageFeature(analyses.map((analysis) => analysis.feature));
    const minimumSimilarity = Math.min(...analyses.map((analysis) => cosineSimilarity(analysis.feature, average)));
    if (minimumSimilarity < ENROLLMENT_CONSISTENCY_THRESHOLD) {
      throw new AppError("Face samples are not consistent enough. Please re-capture the same person in steady lighting.", 400);
    }

    const template: LocalTemplate = {
      provider: this.name,
      templateVersion: this.modelVersion,
      feature: average,
      sampleHashes: analyses.map((analysis) => analysis.imageHash),
      samplePerceptualHashes: analyses.map((analysis) => analysis.perceptualHash),
      createdAt: new Date().toISOString(),
    };

    return {
      provider: this.name,
      templateVersion: this.modelVersion,
      template: JSON.stringify(template),
      qualityChecks: analyses.map((analysis) => analysis.quality),
    };
  }

  async verify(image: string, encryptedTemplate: string): Promise<FaceVerificationResult> {
    const template = JSON.parse(decryptSecret(encryptedTemplate)) as LocalTemplate;
    if (template.provider !== this.name || template.templateVersion !== this.modelVersion) {
      throw new AppError("Face enrollment was created with an unsupported provider. Please re-enroll.", 428);
    }

    const analysis = analyzeFaceImage(image);
    assertQuality(analysis);

    const exactReplay = template.sampleHashes.includes(analysis.imageHash);
    const nearEnrollmentReplay = template.samplePerceptualHashes.some(
      (hash) => hammingDistance(hash, analysis.perceptualHash) <= 4,
    );
    const livenessPassed = !exactReplay && !nearEnrollmentReplay;
    const similarity = cosineSimilarity(analysis.feature, template.feature);

    return {
      matched: similarity >= MATCH_THRESHOLD,
      livenessPassed,
      modelVersion: this.modelVersion,
    };
  }
}

export const faceRecognitionProvider: FaceRecognitionProvider = new LocalPrivateFaceRecognitionProvider();
