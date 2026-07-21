import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: error.flatten().fieldErrors,
      requestId: req.requestId,
    });
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.message,
      requestId: req.requestId,
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      requestId: req.requestId,
    });
  }

  logger.error(error);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId: req.requestId,
    stack: env.NODE_ENV === "production" ? undefined : error.stack,
  });
};
