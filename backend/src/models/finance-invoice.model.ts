import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export const invoiceStatuses = ["Draft", "Sent", "Paid", "Overdue"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  rate: number;
};

export type Invoice = {
  organizationId: Types.ObjectId;
  invoiceNo: string;
  customer: string;
  email: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  lastAction: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceDocument = HydratedDocument<Invoice>;

const invoiceLineItemSchema = new Schema<InvoiceLineItem>(
  {
    description: { type: String, required: true, trim: true, maxlength: 200 },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema<Invoice>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    invoiceNo: { type: String, required: true, trim: true, maxlength: 40 },
    customer: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    items: { type: [invoiceLineItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: invoiceStatuses, default: "Draft", index: true },
    lastAction: { type: String, trim: true, maxlength: 200 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

invoiceSchema.index({ organizationId: 1, invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export const InvoiceModel = model("Invoice", invoiceSchema);
