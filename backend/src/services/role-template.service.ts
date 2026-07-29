import type { Types } from "mongoose";
import { roleTemplateRepository } from "../repositories/role-template.repository.js";
import { auditService } from "./audit.service.js";
import { AppError } from "../utils/app-error.js";
import type {
  CreateRoleTemplateInput,
  ListRoleTemplatesQuery,
  UpdateRoleTemplateInput,
} from "../validation/role-template.validation.js";

export class RoleTemplateService {
  async create(input: CreateRoleTemplateInput, userId?: string) {
    const template = await roleTemplateRepository.create(input);

    await auditService.record({
      actorUserId: userId ?? "",
      action: "role_template.create",
      targetType: "RoleTemplate",
      targetId: template._id as Types.ObjectId,
      after: { name: template.name, permissionKeys: template.permissionKeys },
    });

    return template;
  }

  async list(query: ListRoleTemplatesQuery) {
    return roleTemplateRepository.list(query);
  }

  async getById(id: string) {
    const template = await roleTemplateRepository.findById(id);
    if (!template) {
      throw new AppError("Role template not found", 404);
    }
    return template;
  }

  async update(id: string, input: UpdateRoleTemplateInput, userId?: string) {
    const existing = await roleTemplateRepository.findById(id);
    if (!existing) {
      throw new AppError("Role template not found", 404);
    }

    const template = await roleTemplateRepository.update(id, input);
    if (!template) {
      throw new AppError("Role template not found", 404);
    }

    await auditService.record({
      actorUserId: userId ?? "",
      action: "role_template.update",
      targetType: "RoleTemplate",
      targetId: existing._id as Types.ObjectId,
      before: { permissionKeys: existing.permissionKeys },
      after: { permissionKeys: template.permissionKeys },
    });

    return template;
  }

  async delete(id: string, userId?: string) {
    const existing = await roleTemplateRepository.findById(id);
    if (!existing) {
      throw new AppError("Role template not found", 404);
    }

    await roleTemplateRepository.delete(id);

    await auditService.record({
      actorUserId: userId ?? "",
      action: "role_template.delete",
      targetType: "RoleTemplate",
      targetId: existing._id as Types.ObjectId,
      before: { name: existing.name },
    });

    return { deleted: true };
  }
}

export const roleTemplateService = new RoleTemplateService();
