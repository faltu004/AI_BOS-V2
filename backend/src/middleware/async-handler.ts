import type { NextFunction, Request, RequestHandler, Response } from "express";

export function asyncHandler(controller: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(controller(req, res, next)).catch(next);
  };
}

export function route(...handlers: RequestHandler[]): RequestHandler[] {
  const controller = handlers.at(-1);

  if (!controller) {
    return [];
  }

  return [...handlers.slice(0, -1), asyncHandler(controller)];
}
