import type { NextFunction, Request, RequestHandler, Response } from "express";

export function asyncHandler(controller: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(controller(req, res, next)).catch(next);
  };
}
