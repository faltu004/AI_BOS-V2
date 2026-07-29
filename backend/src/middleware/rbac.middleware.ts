import type { RequestHandler } from "express";
import { permissionService } from "../services/permission.service.js";
import { AppError } from "../utils/app-error.js";

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
 * actions the Owner specifically needs power over — e.g. disabling the Administrator's
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
