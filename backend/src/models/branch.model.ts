import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import { branchTypes, type BranchType } from "../constants/branch.js";
import { departmentStatuses, type DepartmentStatus } from "../constants/department.js";

export type Branch = {
  organizationId: Types.ObjectId;
  name: string;
  type: BranchType;
  isHeadOffice: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  timezone: string;
  phone?: string;
  email?: string;
  status: DepartmentStatus;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type BranchDocument = HydratedDocument<Branch>;

const branchSchema = new Schema<Branch>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    type: {
      type: String,
      enum: branchTypes,
      default: "Branch",
    },
    isHeadOffice: {
      type: Boolean,
      default: false,
      index: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "India",
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true,
      maxlength: 60,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    status: {
      type: String,
      enum: departmentStatuses,
      default: "Active",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

branchSchema.index({ organizationId: 1, isHeadOffice: 1 });
branchSchema.index({ organizationId: 1, status: 1 });
branchSchema.index({ name: "text", city: "text", state: "text" });

export const BranchModel = model("Branch", branchSchema);
