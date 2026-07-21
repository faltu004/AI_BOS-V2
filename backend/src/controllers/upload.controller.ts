import type { RequestHandler } from "express";
import { uploadService } from "../services/upload.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class UploadController {
  single: RequestHandler = async (req, res) => {
    const file = uploadService.prepareSingleFile(req.file);

    sendSuccess(res, 201, {
      message: "File received successfully",
      data: file,
    });
  };
}

export const uploadController = new UploadController();
