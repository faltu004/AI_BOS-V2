import type { RequestHandler } from "express";
import type { ProjectMemberRole } from "../models/project-member.model.js";
import { projectMemberRepository } from "../repositories/project-member.repository.js";
import { permissionService } from "../services/permission.service.js";
import { AppError } from "../utils/app-error.js";

/**
 * Restricts project-member management to users who are themselves a member of
 * THIS project with one of `allowedRoles` (e.g. "Owner"/"Manager") — org-wide
 * `hasFullAccess` roles (Owner/Administrator) still bypass, same convention as
 * `requirePermission`. Without this, the flat `project.update` permission alone
 * would let any manager add/remove members on any project in the org, not just
 * ones they're actually part of.
 */
export function requireProjectRole(...allowedRoles: ProjectMemberRole[]): RequestHandler {
  return async (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { hasFullAccess } = await permissionService.resolveEffectivePermissions(req.user.role);
    if (hasFullAccess) {
      return next();
    }

    const projectId = req.params.id;
    const membership = await projectMemberRepository.find(projectId, req.user.id);

    if (!membership || !allowedRoles.includes(membership.role)) {
      return next(new AppError("You must be an Owner or Manager on this project to manage its members", 403));
    }

    return next();
  };
}
