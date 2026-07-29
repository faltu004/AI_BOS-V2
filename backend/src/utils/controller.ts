import type { Request, RequestHandler, Response } from "express";
import { sendSuccess } from "./api-response.js";

type ControllerContext = {
  req: Request;
  res: Response;
};

type ControllerResult<T> = T | Promise<T>;

export function jsonController<T>(
  statusCode: number,
  message: string,
  handler: (context: ControllerContext) => ControllerResult<T>,
): RequestHandler {
  return async (req, res) => {
    const data = await handler({ req, res });
    sendSuccess(res, statusCode, { message, data });
  };
}

export function emptyJsonController(
  statusCode: number,
  message: string,
  handler: (context: ControllerContext) => ControllerResult<void>,
): RequestHandler {
  return async (req, res) => {
    await handler({ req, res });
    sendSuccess(res, statusCode, { message });
  };
}

export function fileController(
  contentType: string,
  disposition: string,
  handler: (context: ControllerContext) => ControllerResult<Buffer | string>,
): RequestHandler {
  return async (req, res) => {
    const file = await handler({ req, res });
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", disposition);
    res.status(200).send(file);
  };
}
