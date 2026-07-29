import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import { policyCategories, policyStatuses, type PolicyCategory, type PolicyStatus } from "../constants/policy.js";

export type CompanyPolicy = {
  organizationId: Types.ObjectId;
  title: string;
  category: PolicyCategory;
  content: string;
  status: PolicyStatus;
  version: number;
  effectiveDate?: Date;
  acknowledgementRequired: boolean;
  tags: string[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type CompanyPolicyDocument = HydratedDocument<CompanyPolicy>;

const companyPolicySchema = new Schema<CompanyPolicy>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: policyCategories,
      default: "General",
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    status: {
      type: String,
      enum: policyStatuses,
      default: "Draft",
      index: true,
    },
    version: {
      type: Number,
      min: 1,
      default: 1,
    },
    effectiveDate: {
      type: Date,
    },
    acknowledgementRequired: {
      type: Boolean,
      default: false,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

companyPolicySchema.index({ organizationId: 1, status: 1, category: 1, createdAt: -1 });
companyPolicySchema.index({ title: "text", content: "text" });

export const CompanyPolicyModel = model("CompanyPolicy", companyPolicySchema);
