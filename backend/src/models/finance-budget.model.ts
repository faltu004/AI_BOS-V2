import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type Budget = {
  organizationId: Types.ObjectId;
  department: string;
  allocated: number;
  spent: number;
  owner: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type BudgetDocument = HydratedDocument<Budget>;

const budgetSchema = new Schema<Budget>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    department: { type: String, required: true, trim: true, maxlength: 120 },
    allocated: { type: Number, required: true, min: 0 },
    spent: { type: Number, required: true, min: 0, default: 0 },
    owner: { type: String, required: true, trim: true, maxlength: 120 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

budgetSchema.index({ organizationId: 1, department: 1 }, { unique: true });

export const BudgetModel = model("Budget", budgetSchema);
