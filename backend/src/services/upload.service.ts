import { AppError } from "../utils/app-error.js";

const fileSignatures: Record<string, (buffer: Buffer) => boolean> = {
  "application/pdf": (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-",
  "image/jpeg": (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/png": (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
};

function safeFileName(filename: string) {
  return filename
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 180);
}

export class UploadService {
  prepareSingleFile(file?: Express.Multer.File) {
    if (!file) {
      throw new AppError("File is required", 400);
    }

    const isExpectedSignature = fileSignatures[file.mimetype];
    if (!isExpectedSignature || !isExpectedSignature(file.buffer)) {
      throw new AppError("Uploaded file content does not match the declared file type", 415);
    }

    return {
      fieldName: file.fieldname,
      originalName: safeFileName(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}

export const uploadService = new UploadService();
