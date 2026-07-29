import type { RequestHandler } from "express";
import { resetPasswordService } from "../services/reset-password.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { asyncHandler } from "../middleware/async-handler.js";

export class ResetPasswordController {
  requestReset: RequestHandler = async (req, res) => {
    const result = await resetPasswordService.requestReset(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      origin: req.get("origin") ?? undefined,
    });

    sendSuccess(res, 200, {
      message: "If that email exists, a reset link has been sent",
      data: result,
    });
  };

  verifyToken: RequestHandler = async (req, res) => {
    const { token } = req.body as { token: string };
    const result = await resetPasswordService.verifyToken(token);

    sendSuccess(res, 200, {
      message: "Token is valid",
      data: { userId: result.user.id, email: result.user.email },
    });
  };

  setPassword: RequestHandler = async (req, res) => {
    const { token, newPassword }: { token: string; newPassword: string } = req.body;
    const result = await resetPasswordService.setNewPassword(token, { token, newPassword }, {
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      deviceId: req.header("x-device-id") ?? undefined,
    });

    sendSuccess(res, 200, {
      message: "Password set successfully",
      data: result,
    });
  };
}

export const resetPasswordController = new ResetPasswordController();