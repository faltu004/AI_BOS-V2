import type { Types, UpdateQuery } from "mongoose";
import { BudgetModel, type Budget, type BudgetDocument } from "../models/finance-budget.model.js";

export type BudgetCreateData = Pick<Budget, "department" | "allocated" | "spent" | "owner"> &
  Partial<Pick<Budget, "createdBy">> & { organizationId: Types.ObjectId };

export class FinanceBudgetRepository {
  async create(data: BudgetCreateData) {
    return BudgetModel.create(data);
  }

  async list(organizationId: Types.ObjectId) {
    return BudgetModel.find({ organizationId }).sort({ department: 1 }).lean();
  }

  async update(id: string, updates: UpdateQuery<BudgetDocument>) {
    return BudgetModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return BudgetModel.findByIdAndDelete(id).select("_id").lean();
  }
}

export const financeBudgetRepository = new FinanceBudgetRepository();
