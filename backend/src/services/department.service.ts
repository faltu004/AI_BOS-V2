import type { Types } from "mongoose";
import { departmentRepository } from "../repositories/department.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { teamRepository } from "../repositories/team.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { userService } from "./user.service.js";
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

type PopulatedHead = { _id: Types.ObjectId; fullName: string; email: string; role: string };

function toDepartmentDto(department: { headId?: unknown; [key: string]: unknown }) {
  const head = department.headId as PopulatedHead | Types.ObjectId | undefined;
  const isPopulated = head && typeof head === "object" && "fullName" in head;

  return {
    ...department,
    headId: isPopulated ? (head as PopulatedHead)._id.toString() : head?.toString(),
    head: isPopulated
      ? { id: (head as PopulatedHead)._id.toString(), fullName: (head as PopulatedHead).fullName, email: (head as PopulatedHead).email }
      : undefined,
  };
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

    const head = await userRepository.findById(input.headId);
    if (!head || !head.isActive) {
      throw new AppError("Selected department head was not found", 404);
    }

    const department = await departmentRepository.create({
      ...input,
      organizationId,
      headId: input.headId as unknown as Types.ObjectId,
      parentDepartmentId: input.parentDepartmentId as unknown as Types.ObjectId,
      branchId: input.branchId as unknown as Types.ObjectId,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });

    // The head is automatically the department's first member — a department can't
    // exist with zero people in it, same as a group needs its creating admin.
    await userRepository.updateEmployeeProfile(input.headId, { departmentId: department.id });

    return department;
  }

  async list(query: ListDepartmentsQuery) {
    const organizationId = await resolveOrganizationId();
    const result = await departmentRepository.list(organizationId, query);

    const items = await Promise.all(
      result.items.map(async (department) => {
        const members = await userService.listUsersByDepartment(department._id.toString());
        return { ...toDepartmentDto(department), memberCount: members.length };
      }),
    );

    return { items, pagination: result.pagination };
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

  async members(id: string) {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new AppError("Department not found", 404);
    }
    return userService.listUsersByDepartment(id);
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
