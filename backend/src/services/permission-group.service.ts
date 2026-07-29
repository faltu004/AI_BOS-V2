import type { Types } from "mongoose";
import { permissionGroupRepository } from "../repositories/permission-group.repository.js";
import { auditService } from "./audit.service.js";
import { AppError } from "../utils/app-error.js";
import type {
  CreatePermissionGroupInput,
  ListPermissionGroupsQuery,
  UpdatePermissionGroupInput,
} from "../validation/permission-group.validation.js";

export class PermissionGroupService {
  async create(input: CreatePermissionGroupInput, userId?: string) {
    const group = await permissionGroupRepository.create(input);

    await auditService.record({
      actorUserId: userId ?? "",
      action: "permission_group.create",
      targetType: "PermissionGroup",
      targetId: group._id as Types.ObjectId,
      after: { name: group.name, permissionKeys: group.permissionKeys },
    });

    return group;
  }

  async list(query: ListPermissionGroupsQuery) {
    return permissionGroupRepository.list(query);
  }

  async getById(id: string) {
    const group = await permissionGroupRepository.findById(id);
    if (!group) {
      throw new AppError("Permission group not found", 404);
    }
    return group;
  }

  async update(id: string, input: UpdatePermissionGroupInput, userId?: string) {
    const existing = await permissionGroupRepository.findById(id);
    if (!existing) {
      throw new AppError("Permission group not found", 404);
    }

    const group = await permissionGroupRepository.update(id, input);
    if (!group) {
      throw new AppError("Permission group not found", 404);
    }

    await auditService.record({
      actorUserId: userId ?? "",
      action: "permission_group.update",
      targetType: "PermissionGroup",
      targetId: existing._id as Types.ObjectId,
      before: { permissionKeys: existing.permissionKeys },
      after: { permissionKeys: group.permissionKeys },
    });

    return group;
  }

  async delete(id: string, userId?: string) {
    const existing = await permissionGroupRepository.findById(id);
    if (!existing) {
      throw new AppError("Permission group not found", 404);
    }

    await permissionGroupRepository.delete(id);

    await auditService.record({
      actorUserId: userId ?? "",
      action: "permission_group.delete",
      targetType: "PermissionGroup",
      targetId: existing._id as Types.ObjectId,
      before: { name: existing.name },
    });

    return { deleted: true };
  }
}

export const permissionGroupService = new PermissionGroupService();
