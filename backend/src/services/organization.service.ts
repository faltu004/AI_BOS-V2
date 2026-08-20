import { organizationRepository } from "../repositories/organization.repository.js";
import type { UpdateOrganizationInput } from "../validation/organization.validation.js";

export class OrganizationService {
  async get() {
    return organizationRepository.getOrCreateDefault();
  }

  async update(input: UpdateOrganizationInput, userId?: string) {
    const normalized = { ...input };
    if (normalized.logo === "") {
      delete normalized.logo;
    }
    return organizationRepository.upsertGlobal({ ...normalized, updatedBy: userId });
  }
}

export const organizationService = new OrganizationService();
