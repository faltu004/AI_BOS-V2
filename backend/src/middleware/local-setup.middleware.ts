import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

const loopbackAddresses = new Set(["127.0.0.1", "::1"]);

function normalizeRemoteAddress(value?: string) {
  return value
    ?.replace(/^::ffff:/, "")
    .trim()
    .toLowerCase();
}

export const requireLocalSetupRequest: RequestHandler = (req, _res, next) => {
  /*
   * Security boundary:
   *
   * First Owner bootstrap must be initiated by a process connecting
   * directly from the Master Server itself.
   *
   * Do not authorize this route from req.ip, req.hostname, Host,
   * X-Forwarded-For, or X-Forwarded-Host because those values can be
   * affected by proxy configuration or request headers.
   */
  const remoteAddress = normalizeRemoteAddress(
    req.socket.remoteAddress,
  );

  if (
    remoteAddress &&
    loopbackAddresses.has(remoteAddress)
  ) {
    return next();
  }

  return next(
    new AppError(
      "First Owner setup is available only from the Master Server local setup channel",
      403,
    ),
  );
};