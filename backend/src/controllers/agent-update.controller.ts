import {
  createReadStream,
} from "node:fs";

import {
  pipeline,
} from "node:stream/promises";

import type {
  RequestHandler,
} from "express";

import {
  agentUpdateService,
} from "../services/agent-update.service.js";

import {
  agentUpdatePackageService,
} from "../services/agent-update-package.service.js";

export class AgentUpdateController {
  getManifest:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const manifest =
          agentUpdateService
            .getManifest(
              req.query
                .currentVersion,
            );

        res.status(200).json({
          success: true,
          data: manifest,
        });
      };

  getPackage:
    RequestHandler =
      async (
        req,
        res,
      ) => {
        const verified =
          await agentUpdatePackageService
            .verifyPackage(
              req.params.version,
            );

        if (!verified) {
          res.status(404).json({
            success: false,
            message:
              "Approved agent update package not found",
          });

          return;
        }

        res.status(200);

        res.setHeader(
          "Content-Type",
          "application/zip",
        );

        res.setHeader(
          "Content-Length",
          String(
            verified.release
              .sizeBytes,
          ),
        );

        res.setHeader(
          "Cache-Control",
          "private, no-store",
        );

        res.setHeader(
          "X-Content-Type-Options",
          "nosniff",
        );

        res.setHeader(
          "Content-Disposition",
          'attachment; filename="' +
            verified.release
              .packageId +
            '.zip"',
        );

        await pipeline(
          createReadStream(
            verified.filePath,
          ),
          res,
        );
      };

  getOperationalStatus:
    RequestHandler =
      async (
        _req,
        res,
      ) => {
        const status =
          agentUpdateService
            .getOperationalStatus();

        res.status(200).json({
          success: true,
          data: status,
        });
      };
}

export const agentUpdateController =
  new AgentUpdateController();
