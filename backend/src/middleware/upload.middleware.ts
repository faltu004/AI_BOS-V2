import multer from "multer";
import { uploadConfig } from "../config/upload.js";
import { AppError } from "../utils/app-error.js";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: uploadConfig.maxFileSizeBytes,
  },
  fileFilter(_req, file, callback) {
    if (!uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
      callback(new AppError("Unsupported file type", 415));
      return;
    }

    callback(null, true);
  },
});
