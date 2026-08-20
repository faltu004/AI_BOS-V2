import type {
  Request,
  RequestHandler,
} from "express";
import { managedDeviceService } from "../services/managed-device.service.js";

function getClientIp(
  req: Request,
): string {
  const forwardedFor =
    req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return (
      forwardedFor
        .split(",")[0]
        ?.trim() || ""
    );
  }

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0] || "";
  }

  return (
    req.ip ||
    req.socket.remoteAddress ||
    ""
  );
}

export class ManagedDeviceController {
  register: RequestHandler =
    async (req, res) => {
      const device =
        await managedDeviceService.register({
          ...req.body,
          lastIp: getClientIp(req),
        });

      res.status(201).json({
        success: true,
        message:
          "Device registered successfully",
        data: device,
      });
    };

  heartbeat: RequestHandler =
    async (req, res) => {
      const device =
        await managedDeviceService.heartbeat({
          ...req.body,
          lastIp: getClientIp(req),
        });

      res.status(200).json({
        success: true,
        message:
          "Device heartbeat received",
        data: device,
      });
    };

  list: RequestHandler =
    async (_req, res) => {
      const devices =
        await managedDeviceService.list();

      res.status(200).json({
        success: true,
        data: devices,
      });
    };

  getByDeviceId: RequestHandler =
    async (req, res) => {
      const deviceId =
        req.params.deviceId;

      const device =
        await managedDeviceService.getByDeviceId(
          deviceId,
        );

      res.status(200).json({
        success: true,
        data: device,
      });
    };

  getMetrics: RequestHandler =
    async (req, res) => {
      const deviceId =
        req.params.deviceId;

      const range =
        typeof req.query.range ===
        "string"
          ? req.query.range
          : undefined;

      const metrics =
        await managedDeviceService.getMetrics(
          deviceId,
          range,
        );

      res.status(200).json({
        success: true,
        data: metrics,
      });
    };
}

export const managedDeviceController =
  new ManagedDeviceController();
