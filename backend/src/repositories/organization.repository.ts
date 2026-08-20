import { organizationScope } from "../constants/organization.js";
import { OrganizationModel, type Organization } from "../models/organization.model.js";

export class OrganizationRepository {
  async findGlobal() {
    return OrganizationModel.findOne({ scope: organizationScope });
  }

  async upsertGlobal(input: Partial<Organization>) {
    return OrganizationModel.findOneAndUpdate(
      { scope: organizationScope },
      { $set: { ...input, scope: organizationScope } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  async getOrCreateDefault() {
    const existing = await this.findGlobal();
    if (existing) return existing;
    return this.upsertGlobal({ name: "Company" });
  }
}

export const organizationRepository = new OrganizationRepository();
