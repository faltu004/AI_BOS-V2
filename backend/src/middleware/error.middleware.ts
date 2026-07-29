import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const errorContext = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
  };

  if (error instanceof ZodError) {
    logger.warn({ ...errorContext, issues: error.issues }, "request validation failed");

    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: error.flatten().fieldErrors,
      requestId: req.requestId,
    });
  }

  if (error instanceof multer.MulterError) {
    logger.warn({ ...errorContext, code: error.code }, "upload validation failed");

    return res.status(400).json({
      success: false,
      message: error.message,
      requestId: req.requestId,
    });
  }

  if (error instanceof AppError) {
    logger.warn({ ...errorContext, statusCode: error.statusCode }, error.message);

    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      requestId: req.requestId,
    });
  }

  logger.error({ ...errorContext, error }, "unhandled request error");

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId: req.requestId,
    stack: env.NODE_ENV === "production" ? undefined : error.stack,
  });
};
