import { nanoid } from "nanoid";
import type { RequestHandler } from "express";

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const requestId = req.headers["x-request-id"]?.toString() ?? nanoid();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
};
