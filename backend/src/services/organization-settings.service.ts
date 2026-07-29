import { organizationRepository } from "../repositories/organization.repository.js";
import { organizationSettingsRepository } from "../repositories/organization-settings.repository.js";
import type { UpdateModuleAccessInput, UpdateOrganizationSettingsInput } from "../validation/organization-settings.validation.js";

export class OrganizationSettingsService {
  async get() {
    const organization = await organizationRepository.getOrCreateDefault();
    return organizationSettingsRepository.getOrCreateDefault(organization._id);
  }

  async update(input: UpdateOrganizationSettingsInput, userId?: string) {
    const organization = await organizationRepository.getOrCreateDefault();
    await organizationSettingsRepository.getOrCreateDefault(organization._id);
    return organizationSettingsRepository.upsertGlobal({ ...input, updatedBy: userId });
  }

  async updateModuleAccess(input: UpdateModuleAccessInput, userId?: string) {
    const organization = await organizationRepository.getOrCreateDefault();
    const current = await organizationSettingsRepository.getOrCreateDefault(organization._id);
    return organizationSettingsRepository.upsertGlobal({
      moduleAccess: { ...current.moduleAccess, ...input },
      updatedBy: userId,
    });
  }
}

export const organizationSettingsService = new OrganizationSettingsService();
