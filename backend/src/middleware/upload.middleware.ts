import multer from "multer";
import path from "node:path";
import { uploadConfig } from "../config/upload.js";
import { AppError } from "../utils/app-error.js";

export function resolveUnsafeExt(filename?: string) {
  const base = typeof filename === "string" ? path.basename(filename) : "upload";
  const normalized = base.normalize("NFKC");
  const lower = normalized.toLowerCase();
  if (lower.includes("\0") || lower.includes("/") || lower.includes("\\") || lower.includes("..")) {
    return null;
  }
  const ext = path.extname(lower);
  return { base: normalized.substring(0, uploadConfig.maxOriginalNameLength), ext };
}

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: uploadConfig.maxFileSizeBytes,
  },
  fileFilter(_req, file, callback) {
    const originalName = file.originalname;
    const resolved = resolveUnsafeExt(originalName);
    if (!resolved) {
      callback(new AppError("Unsupported file name", 415));
      return;
    }

    if (!resolved.ext || !uploadConfig.allowedExtensions.includes(resolved.ext)) {
      callback(new AppError("Unsupported file extension", 415));
      return;
    }

    if (!uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
      callback(new AppError("Unsupported file type", 415));
      return;
    }

    if (!file.originalname.endsWith(resolved.ext)) {
      callback(new AppError("File extension does not match content", 415));
      return;
    }

    callback(null, true);
  },
});

