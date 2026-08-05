import type { FilterQuery, Types } from "mongoose";
import {
  FinanceTransactionModel,
  type FinanceTransaction,
  type FinanceTransactionType,
} from "../models/finance-transaction.model.js";

export type FinanceTransactionCreateData = Pick<
  FinanceTransaction,
  "type" | "title" | "category" | "amount" | "date" | "owner" | "status"
> &
  Partial<Pick<FinanceTransaction, "createdBy">> & { organizationId: Types.ObjectId };

export class FinanceTransactionRepository {
  async create(data: FinanceTransactionCreateData) {
    return FinanceTransactionModel.create(data);
  }

  async findById(id: string) {
    return FinanceTransactionModel.findById(id).lean();
  }

  async list(organizationId: Types.ObjectId, query: { type?: FinanceTransactionType; limit?: number }) {
    const filter: FilterQuery<FinanceTransaction> = { organizationId };
    if (query.type) filter.type = query.type;

    return FinanceTransactionModel.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(query.limit ?? 100)
      .lean();
  }

  async update(id: string, updates: Partial<FinanceTransactionCreateData>) {
    return FinanceTransactionModel.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return FinanceTransactionModel.findByIdAndDelete(id).select("_id").lean();
  }

  async sumByType(organizationId: Types.ObjectId, type: FinanceTransactionType) {
    const [result] = await FinanceTransactionModel.aggregate<{ total: number }>([
      { $match: { organizationId, type } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result?.total ?? 0;
  }

  async monthlySeries(organizationId: Types.ObjectId, months: number) {
    return FinanceTransactionModel.aggregate<{ _id: { month: string; type: string }; total: number }>([
      { $match: { organizationId } },
      {
        $group: {
          _id: { month: { $substrCP: ["$date", 0, 7] }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
      { $limit: months * 2 },
    ]);
  }
}

export const financeTransactionRepository = new FinanceTransactionRepository();
