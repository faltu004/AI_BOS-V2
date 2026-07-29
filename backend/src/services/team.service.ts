import type { Types } from "mongoose";
import { departmentRepository } from "../repositories/department.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { teamRepository } from "../repositories/team.repository.js";
import { AppError } from "../utils/app-error.js";
import type { CreateTeamInput, ListTeamsQuery, UpdateTeamInput } from "../validation/team.validation.js";

async function resolveOrganizationId(): Promise<Types.ObjectId> {
  const organization = await organizationRepository.getOrCreateDefault();
  return organization._id as Types.ObjectId;
}

async function assertDepartmentExists(departmentId: string) {
  const department = await departmentRepository.findById(departmentId);
  if (!department) {
    throw new AppError("Department not found", 404);
  }
}

export class TeamService {
  async create(input: CreateTeamInput, userId?: string) {
    const organizationId = await resolveOrganizationId();
    await assertDepartmentExists(input.departmentId);

    return teamRepository.create({
      ...input,
      organizationId,
      departmentId: input.departmentId as unknown as Types.ObjectId,
      leadId: input.leadId as unknown as Types.ObjectId,
      memberIds: input.memberIds as unknown as Types.ObjectId[],
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListTeamsQuery) {
    const organizationId = await resolveOrganizationId();
    return teamRepository.list(organizationId, query);
  }

  async listAll() {
    const organizationId = await resolveOrganizationId();
    return teamRepository.listAll(organizationId);
  }

  async getById(id: string) {
    const team = await teamRepository.findById(id);
    if (!team) {
      throw new AppError("Team not found", 404);
    }
    return team;
  }

  async update(id: string, input: UpdateTeamInput, userId?: string) {
    if (input.departmentId) {
      await assertDepartmentExists(input.departmentId);
    }

    const team = await teamRepository.update(id, { ...input, updatedBy: userId });
    if (!team) {
      throw new AppError("Team not found", 404);
    }
    return team;
  }

  async delete(id: string) {
    const team = await teamRepository.delete(id);
    if (!team) {
      throw new AppError("Team not found", 404);
    }
    return { deleted: true };
  }
}

export const teamService = new TeamService();
