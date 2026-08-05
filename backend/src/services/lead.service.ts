import type { Types } from "mongoose";
import { leadRepository } from "../repositories/lead.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import type { LeadStatus } from "../models/lead.model.js";
import { AppError } from "../utils/app-error.js";
import type { ListLeadsQuery, UpdateLeadInput } from "../validation/lead.validation.js";

export type CreateLeadInput = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  value?: number;
  ownerId?: string;
  metadata?: Record<string, unknown>;
};

export class LeadService {
  async create(input: CreateLeadInput, userId?: string) {
    const actor = userId ? await userRepository.findById(userId) : null;

    return leadRepository.create({
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      source: input.source ?? "Workflow",
      status: input.status ?? "New",
      value: input.value ?? 0,
      ownerId: input.ownerId as unknown as Types.ObjectId,
      organizationId: actor?.organizationId,
      metadata: input.metadata ?? {},
      createdBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListLeadsQuery) {
    return leadRepository.list(query);
  }

  async getById(id: string) {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw new AppError("Lead not found", 404);
    }
    return lead;
  }

  async update(id: string, input: UpdateLeadInput) {
    const lead = await leadRepository.update(id, input);
    if (!lead) {
      throw new AppError("Lead not found", 404);
    }
    return lead;
  }

  async delete(id: string) {
    const lead = await leadRepository.delete(id);
    if (!lead) {
      throw new AppError("Lead not found", 404);
    }
    return { deleted: true };
  }

  async assignOwner(leadId: string, ownerId: string) {
    const lead = await leadRepository.updateOwner(leadId, ownerId);
    if (!lead) {
      throw new AppError("Lead not found", 404);
    }
    return lead;
  }

  async stats() {
    return leadRepository.stats();
  }
}

export const leadService = new LeadService();
