import type { Types } from "mongoose";
import { IntegrationLogModel } from "../models/integration-log.model.js";
import type { IntegrationKey, IntegrationLogAction, IntegrationLogStatus } from "../constants/integration.js";

export class IntegrationLogRepository {
  async create(organizationId: Types.ObjectId, integrationKey: IntegrationKey, action: IntegrationLogAction, status: IntegrationLogStatus, message: string) {
    return IntegrationLogModel.create({ organizationId, integrationKey, action, status, message });
  }

  async list(organizationId: Types.ObjectId, integrationKey: IntegrationKey, limit = 50) {
    return IntegrationLogModel.find({ organizationId, integrationKey }).sort({ createdAt: -1 }).limit(limit).lean();
  }
}

export const integrationLogRepository = new IntegrationLogRepository();
