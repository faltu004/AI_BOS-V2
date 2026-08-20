import type { RequestHandler } from "express";
import { permissionService } from "../services/permission.service.js";
import { AppError } from "../utils/app-error.js";
import type {
  AdministratorMonitoringPermissionKey,
} from "../constants/administrator-monitoring-access.js";
import {
  administratorMonitoringAccessService,
} from "../services/administrator-monitoring-access.service.js";

export function requirePermission(...keys: string[]): RequestHandler {
  return async (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { hasFullAccess, permissionKeys } = await permissionService.resolveEffectivePermissions(req.user.role);

    if (!hasFullAccess && !keys.some((key) => permissionKeys.has(key))) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    return next();
  };
}

/**
 * Explicit role check that is NOT bypassed by `hasFullAccess` (unlike requirePermission).
 * Administrator also has hasFullAccess:true, so it must never be trusted to gate
 * actions the Owner specifically needs power over â€” e.g. disabling the Administrator's
 * own Admin Panel access.
 */
export function requireRole(...roles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    return next();
  };
}


/**
 * Sensitive administrative permission gate.
 *
 * Owner always has authority.
 *
 * Administrator does NOT inherit access
 * merely because the normal RBAC resolver
 * reports hasFullAccess.
 *
 * For sensitive operations the permission
 * key must be explicitly present in the
 * role's effective permission set.
 *
 * Other roles are denied.
 */
export function requireOwnerOrExplicitPermission(
  ...keys: string[]
): RequestHandler {
  return async (
    req,
    _res,
    next,
  ) => {
    if (!req.user) {
      return next(
        new AppError(
          "Authentication required",
          401,
        ),
      );
    }

    if (
      req.user.role ===
      "Owner"
    ) {
      return next();
    }

    if (
      req.user.role !==
      "Administrator"
    ) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          403,
        ),
      );
    }

    const {
      permissionKeys,
    } =
      await permissionService
        .resolveEffectivePermissions(
          req.user.role,
        );

    /*
     * Deliberately ignore
     * hasFullAccess here.
     *
     * This prevents the built-in
     * Administrator full-access shortcut
     * from bypassing sensitive permissions.
     */
    const allowed =
      keys.some(
        (key) =>
          permissionKeys.has(
            key,
          ),
      );

    if (!allowed) {
      return next(
        new AppError(
          "Explicit device security permission is required",
          403,
        ),
      );
    }

    return next();
  };
}

export function requireAdministratorMonitoringPermission(
  permission?:
    AdministratorMonitoringPermissionKey,
): RequestHandler {
  return async (
    req,
    _res,
    next,
  ) => {
    if (!req.user) {
      return next(
        new AppError(
          "Authentication required",
          401,
        ),
      );
    }

    try {
      await administratorMonitoringAccessService
        .requirePermission(
          req.user.id,
          req.user.role,
          permission,
        );

      return next();
    } catch (error) {
      return next(
        error,
      );
    }
  };
}

const softwareCommandTypes =
  new Set([
    "INSTALL_APP",
    "UNINSTALL_APP",
    "UPDATE_APP",
  ]);

export const requireAdministratorDeviceCommandPermission:
  RequestHandler =
    async (
      req,
      _res,
      next,
    ) => {
      if (!req.user) {
        return next(
          new AppError(
            "Authentication required",
            401,
          ),
        );
      }

      const type =
        typeof req.body?.type ===
          "string"
          ? req.body.type
              .trim()
              .toUpperCase()
          : "";

      const permission:
        AdministratorMonitoringPermissionKey =
        softwareCommandTypes.has(
          type,
        )
          ? "device.software.manage"
          : "device.command.execute";

      try {
        await administratorMonitoringAccessService
          .requirePermission(
            req.user.id,
            req.user.role,
            permission,
          );

        return next();
      } catch (error) {
        return next(
          error,
        );
      }
    };
