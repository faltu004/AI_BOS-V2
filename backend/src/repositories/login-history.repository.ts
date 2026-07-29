import { FilterQuery, Types } from "mongoose";
import { LoginHistoryModel, type LoginHistory } from "../models/login-history.model.js";

export type CreateLoginHistoryInput = Pick<LoginHistory, "user" | "eventType" | "ip" | "userAgent" | "deviceId" | "location" | "metadata" | "failureReason">;

export class LoginHistoryRepository {
  async create(input: CreateLoginHistoryInput) {
    return LoginHistoryModel.create({
      ...input,
      user: new Types.ObjectId(input.user),
    });
  }

  async findManyByUser(userId: string, limit = 50) {
    return LoginHistoryModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async findRecentByUser(userId: string, since: Date) {
    return LoginHistoryModel.find({ user: userId, createdAt: { $gte: since } }).lean();
  }
}

export const loginHistoryRepository = new LoginHistoryRepository();


