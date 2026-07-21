import { AppError } from "../utils/app-error.js";

export class UploadService {
  prepareSingleFile(file?: Express.Multer.File) {
    if (!file) {
      throw new AppError("File is required", 400);
    }

    return {
      fieldName: file.fieldname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}

export const uploadService = new UploadService();
