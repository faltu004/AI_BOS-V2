import type { RequestHandler } from "express";
import { logger } from "../utils/logger.js";

function firstForwardedValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const first = value.split(",")[0]?.trim();

  return first && first.length > 0 ? first : undefined;
}

/**
 * Diagnostic-only logging for POST /devices/register, added to trace a
 * production 401 loop back to its source (which process/host is actually
 * calling this endpoint). Deliberately excludes anything from
 * verifyDeviceAgent's inputs: x-device-id, x-device-token, x-device-key,
 * Authorization, cookies, and the request body are never read or logged
 * here, since a device-register attempt is exactly the moment a caller is
 * most likely to be presenting a credential.
 *
 * socketRemoteAddress is the direct TCP peer as seen by this Node process.
 * If a TLS-terminating gateway sits in front of the backend, that will be
 * the gateway's own address, not the original client -- the gateway is
 * expected to overwrite X-Forwarded-For with the real client address it
 * observed on its own socket before forwarding. forwardedFor/forwardedProto
 * are logged as received for correlation only; they are never trusted for
 * authentication or rate-limiting (app.ts sets "trust proxy" to false).
 */
export const deviceRegisterDiagnosticsMiddleware: RequestHandler = (
  req,
  res,
  next,
) => {
  const socketRemoteAddress = req.socket.remoteAddress;
  const forwardedFor = firstForwardedValue(req.header("x-forwarded-for"));
  const forwardedProto = req.header("x-forwarded-proto");
  const userAgent = req.header("user-agent");

  res.on("finish", () => {
    logger.info(
      {
        event: "device_register_attempt",
        requestId: req.requestId,
        statusCode: res.statusCode,
        socketRemoteAddress,
        forwardedFor,
        forwardedProto,
        userAgent,
      },
      "device registration attempt",
    );
  });

  next();
};
