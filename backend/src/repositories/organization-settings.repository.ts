import type { Types } from "mongoose";
import { organizationScope } from "../constants/organization.js";
import {
  OrganizationSettingsModel,
  type OrganizationSettings,
  type WorkspacePreferences,
} from "../models/organization-settings.model.js";

export type OrganizationSettingsUpdateData = Partial<Omit<OrganizationSettings, "workspacePreferences">> & {
  workspacePreferences?: Partial<WorkspacePreferences>;
};

export class OrganizationSettingsRepository {
  async findGlobal() {
    return OrganizationSettingsModel.findOne({ scope: organizationScope });
  }

  async upsertGlobal(input: OrganizationSettingsUpdateData) {
    return OrganizationSettingsModel.findOneAndUpdate(
      { scope: organizationScope },
      { $set: { ...input, scope: organizationScope } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  async getOrCreateDefault(organizationId: Types.ObjectId) {
    const existing = await this.findGlobal();
    if (existing) return existing;
    return this.upsertGlobal({ organizationId });
  }
}

export const organizationSettingsRepository = new OrganizationSettingsRepository();
