import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export const paymentStatuses = ["Completed", "Pending", "Failed"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export type Payment = {
  organizationId: Types.ObjectId;
  customer: string;
  invoiceNo: string;
  amount: number;
  method: string;
  date: string;
  status: PaymentStatus;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentDocument = HydratedDocument<Payment>;

const paymentSchema = new Schema<Payment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    customer: { type: String, required: true, trim: true, maxlength: 160 },
    invoiceNo: { type: String, required: true, trim: true, maxlength: 40 },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, required: true, trim: true, maxlength: 60 },
    date: { type: String, required: true },
    status: { type: String, enum: paymentStatuses, default: "Pending", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

paymentSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export const PaymentModel = model("Payment", paymentSchema);
