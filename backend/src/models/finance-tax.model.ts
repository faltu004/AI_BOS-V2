import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export const taxRecordStatuses = ["Filed", "Pending", "Review"] as const;
export type TaxRecordStatus = (typeof taxRecordStatuses)[number];

export type TaxRecord = {
  organizationId: Types.ObjectId;
  name: string;
  period: string;
  taxableAmount: number;
  taxAmount: number;
  status: TaxRecordStatus;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TaxRecordDocument = HydratedDocument<TaxRecord>;

const taxRecordSchema = new Schema<TaxRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    period: { type: String, required: true, trim: true, maxlength: 40 },
    taxableAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: taxRecordStatuses, default: "Pending", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

taxRecordSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export const TaxRecordModel = model("TaxRecord", taxRecordSchema);
