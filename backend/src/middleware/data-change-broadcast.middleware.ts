import type { NextFunction, Request, Response } from "express";
import { getIO } from "../realtime/socket-server.js";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function resourceFromPath(path: string) {
  const [firstSegment = "unknown"] = path
    .replace(/^\/api\/v\d+\//, "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  return firstSegment;
}

export function dataChangeBroadcastMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!mutatingMethods.has(req.method)) {
    next();
    return;
  }

  res.on("finish", () => {
    if (res.statusCode >= 400) return;

    getIO()?.emit("data:changed", {
      at: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      resource: resourceFromPath(req.originalUrl),
    });
  });

  next();
}
