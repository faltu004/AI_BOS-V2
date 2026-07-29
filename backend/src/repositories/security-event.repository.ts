import { FilterQuery, Types } from "mongoose";
import { SecurityEventModel, type SecurityEvent } from "../models/security-event.model.js";

export type CreateSecurityEventInput = Pick<SecurityEvent, "user" | "eventType" | "severity" | "ip" | "userAgent" | "deviceId" | "description" | "metadata">;

export class SecurityEventRepository {
  async create(input: CreateSecurityEventInput) {
    return SecurityEventModel.create({
      ...input,
      user: input.user ? new Types.ObjectId(input.user) : undefined,
      deviceId: input.deviceId ? new Types.ObjectId(input.deviceId) : undefined,
    });
  }

  async findMany(filter: FilterQuery<SecurityEvent> = {}, limit = 100) {
    return SecurityEventModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async countOpen(filter: FilterQuery<SecurityEvent> = {}) {
    return SecurityEventModel.countDocuments({ ...filter, resolvedAt: { $exists: false } });
  }
}

export const securityEventRepository = new SecurityEventRepository();
