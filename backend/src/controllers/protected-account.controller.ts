import type { RequestHandler } from "express";
import { protectedAccountService } from "../services/protected-account.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class ProtectedAccountController {
  ownerBootstrapStatus: RequestHandler = async (_req, res) => {
    const data = await protectedAccountService.ownerBootstrapStatus();
    sendSuccess(res, 200, { message: "First Owner setup status fetched successfully", data });
  };

  createFirstOwner: RequestHandler = async (req, res) => {
    const data = await protectedAccountService.createFirstOwner(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      deviceId: req.header("x-device-id") ?? undefined,
    });
    sendSuccess(res, 201, { message: "First Owner created successfully", data });
  };

  administratorStatus: RequestHandler = async (_req, res) => {
    const data = await protectedAccountService.getAdministratorStatus();
    sendSuccess(res, 200, { message: "Administrator credential status fetched successfully", data });
  };

  saveAdministrator: RequestHandler = async (req, res) => {
    const data = await protectedAccountService.saveAdministratorCredentials(req.user!.id, req.body);
    sendSuccess(res, 200, { message: "Administrator credentials saved successfully", data });
  };
}

export const protectedAccountController = new ProtectedAccountController();
