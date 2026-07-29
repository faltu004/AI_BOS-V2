import { type FilterQuery } from "mongoose";
import { PasswordHistoryModel } from "../models/password-history.model.js";

export class PasswordHistoryRepository {
  async create(userId: string, passwordHash: string) {
    return PasswordHistoryModel.create({ user: userId, passwordHash });
  }

  async findRecentHashes(userId: string, limit = 5) {
    return PasswordHistoryModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async countByUser(userId: string) {
    return PasswordHistoryModel.countDocuments({ user: userId });
  }

  async pruneOlderThan(userId: string, keep: number) {
    const oldest = await PasswordHistoryModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(keep)
      .lean();

    const ids = oldest.map((item) => item._id);
    if (!ids.length) return 0;
    return PasswordHistoryModel.deleteMany({ _id: { $in: ids } }).then((res) => res.deletedCount ?? 0);
  }
}

export const passwordHistoryRepository = new PasswordHistoryRepository();
