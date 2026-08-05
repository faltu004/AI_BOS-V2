import type { Types } from "mongoose";
import { TaxRecordModel, type TaxRecord } from "../models/finance-tax.model.js";

export type TaxRecordCreateData = Pick<TaxRecord, "name" | "period" | "taxableAmount" | "taxAmount" | "status"> &
  Partial<Pick<TaxRecord, "createdBy">> & { organizationId: Types.ObjectId };

export class FinanceTaxRepository {
  async create(data: TaxRecordCreateData) {
    return TaxRecordModel.create(data);
  }

  async list(organizationId: Types.ObjectId, limit: number) {
    return TaxRecordModel.find({ organizationId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async delete(id: string) {
    return TaxRecordModel.findByIdAndDelete(id).select("_id").lean();
  }
}

export const financeTaxRepository = new FinanceTaxRepository();
