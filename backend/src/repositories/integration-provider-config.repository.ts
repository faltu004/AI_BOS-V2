import { IntegrationProviderConfigModel } from "../models/integration-provider-config.model.js";
import type { IntegrationFamily } from "../constants/integration.js";

export class IntegrationProviderConfigRepository {
  async listAll() {
    return IntegrationProviderConfigModel.find({}).lean();
  }

  async findByFamily(family: IntegrationFamily) {
    return IntegrationProviderConfigModel.findOne({ family }).lean();
  }

  async findByFamilyWithSecret(family: IntegrationFamily) {
    return IntegrationProviderConfigModel.findOne({ family }).select("+clientSecret").lean();
  }

  async upsert(family: IntegrationFamily, data: Partial<{ clientId: string; clientSecret: string; redirectUri: string; isEnabled: boolean; updatedBy: string }>) {
    return IntegrationProviderConfigModel.findOneAndUpdate(
      { family },
      { $set: { family, ...data } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  }
}

export const integrationProviderConfigRepository = new IntegrationProviderConfigRepository();
