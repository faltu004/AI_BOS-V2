import { type FilterQuery } from "mongoose";
import { SessionModel, type Session } from "../models/session.model.js";

export class SessionRepository {
  async create(input: {
    user: string;
    refreshTokenJti: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
    deviceId?: string;
  }) {
    return SessionModel.create({
      user: input.user,
      refreshTokenJti: input.refreshTokenJti,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      ip: input.ip,
      deviceId: input.deviceId,
      status: "active",
    });
  }

  async findById(id: string) {
    return SessionModel.findById(id);
  }

  async findByJti(jti: string) {
    return SessionModel.findOne({ refreshTokenJti: jti });
  }

  async findManyByUser(userId: string, limit = 50) {
    return SessionModel.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async revoke(id: string) {
    return SessionModel.findByIdAndUpdate(id, { status: "revoked" }, { new: true });
  }

  async revokeAllForUser(userId: string) {
    return SessionModel.updateMany({ user: userId, status: "active" }, { status: "revoked" });
  }

  async expireOld() {
    return SessionModel.updateMany({ status: "active", expiresAt: { $lt: new Date() } }, { status: "expired" });
  }
}

export const sessionRepository = new SessionRepository();
