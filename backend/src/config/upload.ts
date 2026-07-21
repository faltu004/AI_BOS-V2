import { appConfig } from "./app.js";

export const uploadConfig = {
  maxFileSizeBytes: appConfig.upload.maxFileSizeMb * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};
