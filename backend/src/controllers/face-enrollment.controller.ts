import type { RequestHandler } from "express";
import { faceEnrollmentService } from "../services/face-enrollment.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class FaceEnrollmentController {
  me: RequestHandler = async (req, res) => {
    const status = await faceEnrollmentService.getOwnStatus(req.user!.id);
    sendSuccess(res, 200, { message: "Face enrollment status fetched successfully", data: status });
  };

  enrollMe: RequestHandler = async (req, res) => {
    const status = await faceEnrollmentService.enrollSelf(req.user!.id, req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      deviceId: req.header("x-device-id") ?? undefined,
    });
    sendSuccess(res, 201, { message: "Face enrollment completed successfully", data: status });
  };

  userStatus: RequestHandler = async (req, res) => {
    const status = await faceEnrollmentService.getUserStatus(req.params.userId);
    sendSuccess(res, 200, { message: "Face enrollment status fetched successfully", data: status });
  };

  resetUser: RequestHandler = async (req, res) => {
    const result = await faceEnrollmentService.resetUserEnrollment(req.user!.id, req.params.userId, req.body);
    sendSuccess(res, 200, { message: "Face enrollment reset successfully", data: result });
  };
}

export const faceEnrollmentController = new FaceEnrollmentController();
