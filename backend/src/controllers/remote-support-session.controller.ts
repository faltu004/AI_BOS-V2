import type {
  RequestHandler,
} from "express";

import {
  AppError,
} from "../utils/app-error.js";

import {
  remoteSupportSessionService,
} from "../services/remote-support-session.service.js";

import {
  disconnectRemoteSupportSession,
} from "../realtime/socket-server.js";

export class RemoteSupportSessionController {
  create:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      if (!req.user) {
        throw new AppError(
          "Authenticated user is required",
          401,
        );
      }

      const result =
        await remoteSupportSessionService
          .createSession({
            deviceId:
              req.params.deviceId,

            requestedBy:
              req.user.id,

            requestedByRole:
              req.user.role,
          });

      res.status(201).json({
        success: true,

        message:
          "Remote support consent request created",

        data:
          result,
      });
    };

  getAdminSession:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await remoteSupportSessionService
          .getAdminSession(
            req.params.deviceId,
            req.params.sessionId,
          );

      res.status(200).json({
        success: true,
        data: result,
      });
    };

  getCurrentAdminSession:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await remoteSupportSessionService
          .getCurrentAdminSession(
            req.params.deviceId,
          );

      res.status(200).json({
        success: true,
        data: result,
      });
    };

  issueViewerToken:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      if (!req.user) {
        throw new AppError(
          "Authenticated user is required",
          401,
        );
      }

      const result =
        await remoteSupportSessionService
          .issueViewerToken({
            deviceId:
              req.params.deviceId,

            sessionId:
              req.params.sessionId,

            requestedBy:
              req.user.id,
          });

      res.status(200).json({
        success: true,
        data: result,
      });
    };

  getPendingForAgent:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await remoteSupportSessionService
          .getPendingForAgent(
            req.query.deviceId,
          );

      res.status(200).json({
        success: true,
        data: result,
      });
    };

  respondToConsent:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await remoteSupportSessionService
          .respondToConsent({
            deviceId:
              req.body?.deviceId,

            sessionId:
              req.params.sessionId,

            decision:
              req.body?.decision,
          });

      res.status(200).json({
        success: true,

        message:
          req.body?.decision ===
          "allow"
            ? "Remote support request approved"
            : "Remote support request declined",

        data:
          result,
      });
    };

  endFromAgent:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await remoteSupportSessionService
          .endSession({
            deviceId:
              req.body?.deviceId,

            sessionId:
              req.params.sessionId,

            reason:
              req.body?.reason ??
              "Device user ended remote support session",
          });

      disconnectRemoteSupportSession(
        result.sessionId,
        result.endReason ??
          "Device user ended remote support session",
      );

      res.status(200).json({
        success: true,

        message:
          "Remote support session ended by device user",

        data:
          result,
      });
    };

  end:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const result =
        await remoteSupportSessionService
          .endSession({
            deviceId:
              req.params.deviceId,

            sessionId:
              req.params.sessionId,

            reason:
              req.body?.reason,
          });

      disconnectRemoteSupportSession(
        result.sessionId,
        result.endReason ??
          "Remote support session ended",
      );

      res.status(200).json({
        success: true,
        message:
          "Remote support session ended",
        data: result,
      });
    };
}

export const remoteSupportSessionController =
  new RemoteSupportSessionController();
