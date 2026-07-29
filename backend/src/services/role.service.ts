import type { Types } from "mongoose";
import { roleRepository } from "../repositories/role.repository.js";
import { roleHistoryRepository } from "../repositories/role-history.repository.js";
import { roleTemplateRepository } from "../repositories/role-template.repository.js";
import { auditService } from "./audit.service.js";
import { AppError } from "../utils/app-error.js";
import { slugify } from "../utils/slugify.js";
import type { CreateRoleInput, ListRolesQuery, UpdateRoleInput } from "../validation/role.validation.js";

export class RoleService {
  async create(input: CreateRoleInput, userId?: string) {
    const slug = slugify(input.name);

    const existing = await roleRepository.existsBySlug(slug);
    if (existing) {
      throw new AppError("A role with this name already exists", 409);
    }

    let permissionKeys = input.permissionKeys;
    if (input.templateId) {
      const template = await roleTemplateRepository.findById(input.templateId);
      if (!template) {
        throw new AppError("Role template not found", 404);
      }
      permissionKeys = [...new Set([...template.permissionKeys, ...input.permissionKeys])];
    }

    const role = await roleRepository.create({
      slug,
      name: input.name,
      description: input.description,
      isSystem: false,
      hasFullAccess: false,
      rank: input.rank,
      permissionKeys,
      templateId: input.templateId as unknown as Types.ObjectId,
      isActive: true,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });

    await auditService.record({
      actorUserId: userId ?? "",
      action: "role.create",
      targetType: "Role",
      targetId: role._id as Types.ObjectId,
      after: { name: role.name, permissionKeys: role.permissionKeys },
    });

    return role;
  }

  async list(query: ListRolesQuery) {
    return roleRepository.list(query);
  }

  async listAll() {
    return roleRepository.listAll();
  }

  async getById(id: string) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError("Role not found", 404);
    }
    return role;
  }

  async update(id: string, input: UpdateRoleInput, userId?: string) {
    const existing = await roleRepository.findById(id);
    if (!existing) {
      throw new AppError("Role not found", 404);
    }

    if (existing.isSystem && existing.hasFullAccess) {
      throw new AppError("Full-access system roles cannot be edited", 403);
    }

    if (existing.isSystem && input.name) {
      throw new AppError("System role names cannot be changed", 403);
    }

    const permissionKeysChanged =
      input.permissionKeys && JSON.stringify(input.permissionKeys) !== JSON.stringify(existing.permissionKeys);

    if (permissionKeysChanged) {
      const previousVersion = await roleHistoryRepository.latestVersion(id);
      await roleHistoryRepository.create({
        roleId: existing._id as Types.ObjectId,
        version: previousVersion + 1,
        permissionKeys: existing.permissionKeys,
        changedBy: userId as unknown as Types.ObjectId,
      });
    }

    const role = await roleRepository.update(id, { ...input, updatedBy: userId });
    if (!role) {
      throw new AppError("Role not found", 404);
    }

    await auditService.record({
      actorUserId: userId ?? "",
      action: "role.update",
      targetType: "Role",
      targetId: existing._id as Types.ObjectId,
      before: { permissionKeys: existing.permissionKeys },
      after: { permissionKeys: role.permissionKeys },
    });

    return role;
  }

  async delete(id: string, userId?: string) {
    const existing = await roleRepository.findById(id);
    if (!existing) {
      throw new AppError("Role not found", 404);
    }

    if (existing.isSystem) {
      throw new AppError("System roles cannot be deleted", 403);
    }

    await roleRepository.delete(id);

    await auditService.record({
      actorUserId: userId ?? "",
      action: "role.delete",
      targetType: "Role",
      targetId: existing._id as Types.ObjectId,
      before: { name: existing.name, permissionKeys: existing.permissionKeys },
    });

    return { deleted: true };
  }
}

export const roleService = new RoleService();
