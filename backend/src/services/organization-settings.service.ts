import { organizationRepository } from "../repositories/organization.repository.js";
import { organizationSettingsRepository } from "../repositories/organization-settings.repository.js";
import type { WorkspacePreferences } from "../models/organization-settings.model.js";
import type { UpdateModuleAccessInput, UpdateOrganizationSettingsInput } from "../validation/organization-settings.validation.js";

export class OrganizationSettingsService {
  async get() {
    const organization = await organizationRepository.getOrCreateDefault();
    return organizationSettingsRepository.getOrCreateDefault(organization._id);
  }

  async update(input: UpdateOrganizationSettingsInput, userId?: string) {
    const organization = await organizationRepository.getOrCreateDefault();
    const current = await organizationSettingsRepository.getOrCreateDefault(organization._id);
    const workspacePreferences = current.workspacePreferences as typeof current.workspacePreferences & {
      toObject?: () => typeof current.workspacePreferences;
    };
    const currentPreferences =
      typeof workspacePreferences.toObject === "function"
        ? workspacePreferences.toObject()
        : workspacePreferences;
    const currentOfficeLocation = currentPreferences.officeLocation ?? {
      name: "Main Office",
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 300,
    };
    const mergedWorkspacePreferences: WorkspacePreferences | undefined = input.workspacePreferences
      ? {
          ...currentPreferences,
          ...input.workspacePreferences,
          officeLocation: {
            ...currentOfficeLocation,
            ...(input.workspacePreferences.officeLocation ?? {}),
            name: input.workspacePreferences.officeLocation?.name ?? currentOfficeLocation.name,
          },
        }
      : undefined;
    return organizationSettingsRepository.upsertGlobal({
      ...input,
      workspacePreferences: mergedWorkspacePreferences,
      updatedBy: userId,
    });
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
