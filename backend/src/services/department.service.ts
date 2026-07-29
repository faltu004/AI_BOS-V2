import type { Types } from "mongoose";
import { departmentRepository } from "../repositories/department.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { teamRepository } from "../repositories/team.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import type {
  CreateDepartmentInput,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from "../validation/department.validation.js";

async function resolveOrganizationId(): Promise<Types.ObjectId> {
  const organization = await organizationRepository.getOrCreateDefault();
  return organization._id as Types.ObjectId;
}

export class DepartmentService {
  async create(input: CreateDepartmentInput, userId?: string) {
    const organizationId = await resolveOrganizationId();

    if (input.parentDepartmentId) {
      const parent = await departmentRepository.findById(input.parentDepartmentId);
      if (!parent) {
        throw new AppError("Parent department not found", 404);
      }
    }

    return departmentRepository.create({
      ...input,
      organizationId,
      headId: input.headId as unknown as Types.ObjectId,
      parentDepartmentId: input.parentDepartmentId as unknown as Types.ObjectId,
      branchId: input.branchId as unknown as Types.ObjectId,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListDepartmentsQuery) {
    const organizationId = await resolveOrganizationId();
    return departmentRepository.list(organizationId, query);
  }

  async listAll() {
    const organizationId = await resolveOrganizationId();
    return departmentRepository.listAll(organizationId);
  }

  async getById(id: string) {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new AppError("Department not found", 404);
    }
    return department;
  }

  async update(id: string, input: UpdateDepartmentInput, userId?: string) {
    if (input.parentDepartmentId) {
      if (input.parentDepartmentId === id) {
        throw new AppError("A department cannot be its own parent", 400);
      }
      const parent = await departmentRepository.findById(input.parentDepartmentId);
      if (!parent) {
        throw new AppError("Parent department not found", 404);
      }
    }

    const department = await departmentRepository.update(id, { ...input, updatedBy: userId });
    if (!department) {
      throw new AppError("Department not found", 404);
    }
    return department;
  }

  async delete(id: string) {
    const [hasTeams, hasUsers, hasChildren] = await Promise.all([
      teamRepository.existsForDepartment(id),
      userRepository.existsWithFilter({ departmentId: id }),
      departmentRepository.existsAsParent(id),
    ]);

    if (hasTeams || hasUsers || hasChildren) {
      throw new AppError(
        "Cannot delete a department with active teams, employees, or sub-departments",
        409,
      );
    }

    const department = await departmentRepository.delete(id);
    if (!department) {
      throw new AppError("Department not found", 404);
    }
    return { deleted: true };
  }
}

export const departmentService = new DepartmentService();
