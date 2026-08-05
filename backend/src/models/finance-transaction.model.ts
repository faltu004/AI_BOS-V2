import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export const financeTransactionTypes = ["Income", "Expense"] as const;
export type FinanceTransactionType = (typeof financeTransactionTypes)[number];

export type FinanceTransaction = {
  organizationId: Types.ObjectId;
  type: FinanceTransactionType;
  title: string;
  category: string;
  amount: number;
  date: string;
  owner: string;
  status: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceTransactionDocument = HydratedDocument<FinanceTransaction>;

const financeTransactionSchema = new Schema<FinanceTransaction>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    type: { type: String, enum: financeTransactionTypes, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    owner: { type: String, required: true, trim: true, maxlength: 120 },
    status: { type: String, required: true, trim: true, maxlength: 40 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

financeTransactionSchema.index({ organizationId: 1, type: 1, date: -1 });

export const FinanceTransactionModel = model("FinanceTransaction", financeTransactionSchema);
