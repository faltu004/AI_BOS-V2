import type {
  RequestHandler,
} from "express";

import {
  softwareCatalogService,
} from "../services/software-catalog.service.js";

import {
  AppError,
} from "../utils/app-error.js";

export class SoftwareCatalogController {
  createPackage:
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

      const softwarePackage =
        await softwareCatalogService
          .createPackage({
            name:
              req.body?.name,

            version:
              req.body?.version,

            publisher:
              req.body?.publisher,

            packageType:
              req.body?.packageType,

            downloadUrl:
              req.body?.downloadUrl,

            sha256:
              req.body?.sha256,

            productCode:
              req.body?.productCode,

            enabled:
              req.body?.enabled,

            requestedBy:
              req.user.id,
          });

      res.status(201).json({
        success: true,
        message:
          "Software package added to approved catalog",
        data:
          softwarePackage,
      });
    };

  listPackages:
    RequestHandler =
    async (
      _req,
      res,
    ) => {
      const packages =
        await softwareCatalogService
          .listPackages();

      res.status(200).json({
        success: true,
        data: {
          packages,
        },
      });
    };

  getPackage:
    RequestHandler =
    async (
      req,
      res,
    ) => {
      const softwarePackage =
        await softwareCatalogService
          .getPackage(
            req.params.packageId,
          );

      res.status(200).json({
        success: true,
        data:
          softwarePackage,
      });
    };

  updatePackage:
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

      const softwarePackage =
        await softwareCatalogService
          .updatePackage({
            packageId:
              req.params.packageId,

            name:
              req.body?.name,

            version:
              req.body?.version,

            publisher:
              req.body?.publisher,

            packageType:
              req.body?.packageType,

            downloadUrl:
              req.body?.downloadUrl,

            sha256:
              req.body?.sha256,

            productCode:
              req.body?.productCode,

            enabled:
              req.body?.enabled,

            requestedBy:
              req.user.id,
          });

      res.status(200).json({
        success: true,
        message:
          "Software package updated",
        data:
          softwarePackage,
      });
    };
}

export const softwareCatalogController =
  new SoftwareCatalogController();
