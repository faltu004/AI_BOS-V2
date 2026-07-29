import type { Types } from "mongoose";
import { IntegrationModel } from "../models/integration.model.js";
import type { IntegrationKey } from "../constants/integration.js";

export class IntegrationRepository {
  async listForOrganization(organizationId: Types.ObjectId) {
    return IntegrationModel.find({ organizationId }).lean();
  }

  async findOne(organizationId: Types.ObjectId, integrationKey: IntegrationKey) {
    return IntegrationModel.findOne({ organizationId, integrationKey });
  }

  async findOneWithTokens(organizationId: Types.ObjectId, integrationKey: IntegrationKey) {
    return IntegrationModel.findOne({ organizationId, integrationKey }).select("+accessToken +refreshToken");
  }

  async upsertConnection(
    organizationId: Types.ObjectId,
    integrationKey: IntegrationKey,
    data: Partial<{
      family: string;
      status: string;
      accessToken: string;
      refreshToken: string;
      tokenExpiresAt: Date;
      grantedScopes: string[];
      connectedBy: string;
      connectedAt: Date;
    }>,
  ) {
    return IntegrationModel.findOneAndUpdate(
      { organizationId, integrationKey },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async updateSettings(organizationId: Types.ObjectId, integrationKey: IntegrationKey, data: Partial<{ autoSyncEnabled: boolean; syncFrequency: string }>) {
    return IntegrationModel.findOneAndUpdate({ organizationId, integrationKey }, { $set: data }, { new: true }).lean();
  }

  async markDisconnected(organizationId: Types.ObjectId, integrationKey: IntegrationKey) {
    return IntegrationModel.findOneAndUpdate(
      { organizationId, integrationKey },
      { $set: { status: "disconnected" }, $unset: { accessToken: "", refreshToken: "", tokenExpiresAt: "" } },
      { new: true },
    ).lean();
  }

  async recordSyncResult(id: string, status: "success" | "error", summary: string) {
    return IntegrationModel.findByIdAndUpdate(
      id,
      { $set: { lastSyncAt: new Date(), lastSyncStatus: status, lastSyncSummary: summary } },
      { new: true },
    ).lean();
  }

  async findAutoSyncCandidates() {
    return IntegrationModel.find({ status: "connected", autoSyncEnabled: true }).select("+accessToken").lean();
  }
}

export const integrationRepository = new IntegrationRepository();
