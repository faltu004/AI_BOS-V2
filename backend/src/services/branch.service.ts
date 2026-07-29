import type { Types } from "mongoose";
import { branchRepository } from "../repositories/branch.repository.js";
import { departmentRepository } from "../repositories/department.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import type {
  CreateBranchInput,
  ListBranchesQuery,
  UpdateBranchInput,
} from "../validation/branch.validation.js";

async function resolveOrganizationId(): Promise<Types.ObjectId> {
  const organization = await organizationRepository.getOrCreateDefault();
  return organization._id as Types.ObjectId;
}

export class BranchService {
  async create(input: CreateBranchInput, userId?: string) {
    const organizationId = await resolveOrganizationId();

    const branch = await branchRepository.create({
      ...input,
      timezone: input.timezone ?? "Asia/Kolkata",
      organizationId,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });

    if (branch.isHeadOffice) {
      await branchRepository.clearHeadOfficeFlag(organizationId, String(branch._id));
    }

    return branch;
  }

  async list(query: ListBranchesQuery) {
    const organizationId = await resolveOrganizationId();
    return branchRepository.list(organizationId, query);
  }

  async listAll() {
    const organizationId = await resolveOrganizationId();
    return branchRepository.listAll(organizationId);
  }

  async getById(id: string) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new AppError("Branch not found", 404);
    }
    return branch;
  }

  async update(id: string, input: UpdateBranchInput, userId?: string) {
    const branch = await branchRepository.update(id, { ...input, updatedBy: userId });
    if (!branch) {
      throw new AppError("Branch not found", 404);
    }

    if (input.isHeadOffice) {
      await branchRepository.clearHeadOfficeFlag(branch.organizationId, id);
    }

    return branch;
  }

  async delete(id: string) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new AppError("Branch not found", 404);
    }

    const [totalBranches, hasDepartments, hasUsers] = await Promise.all([
      branchRepository.countByOrganization(branch.organizationId),
      departmentRepository.existsForBranch(id),
      userRepository.existsWithFilter({ branchId: id }),
    ]);

    if (totalBranches <= 1) {
      throw new AppError("An organization must have at least one branch", 409);
    }
    if (hasDepartments || hasUsers) {
      throw new AppError("Cannot delete a branch with assigned departments or employees", 409);
    }

    await branchRepository.delete(id);
    return { deleted: true };
  }
}

export const branchService = new BranchService();
