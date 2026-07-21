import type { RequestHandler } from "express";
import { roleHierarchy, type UserRole } from "../constants/roles.js";
import { AppError } from "../utils/app-error.js";

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    return next();
  };
}

export function authorizeAtLeast(minimumRole: UserRole): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (roleHierarchy[req.user.role] < roleHierarchy[minimumRole]) {
      return next(new AppError("Insufficient role privileges", 403));
    }

    return next();
  };
}
