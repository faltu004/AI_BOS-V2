import type { Request, RequestHandler, Response } from "express";
import { securityService } from "../services/security.service.js";

export class SecurityController {
  summarize: RequestHandler = async (_req: Request, res: Response) => {
    const summary = await securityService.summarizeSecurity();
    res.status(200).json({ success: true, data: summary });
  };

  listEvents: RequestHandler = async (req: Request, res: Response) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const events = await securityService.listEvents(userId);
    res.status(200).json({ success: true, data: events });
  };

  loginHistory: RequestHandler = async (req: Request, res: Response) => {
    const history = await securityService.loginHistory(req.user!.id);
    res.status(200).json({ success: true, data: history });
  };

  listDevices: RequestHandler = async (req: Request, res: Response) => {
    const devices = await securityService.listDevices(req.user!.id);
    res.status(200).json({ success: true, data: devices });
  };

  trustDevice: RequestHandler = async (req: Request, res: Response) => {
    const device = await securityService.trustDevice(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data: device });
  };

  untrustDevice: RequestHandler = async (req: Request, res: Response) => {
    const device = await securityService.untrustDevice(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data: device });
  };

  revokeDevice: RequestHandler = async (req: Request, res: Response) => {
    const device = await securityService.revokeDevice(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data: device });
  };

  revokeSession: RequestHandler = async (req: Request, res: Response) => {
    const session = await securityService.revokeSession(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data: session });
  };
}

export const securityController = new SecurityController();
