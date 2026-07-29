import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import { departmentStatuses, type DepartmentStatus } from "../constants/department.js";

export type Department = {
  organizationId: Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  headId?: Types.ObjectId;
  parentDepartmentId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  status: DepartmentStatus;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type DepartmentDocument = HydratedDocument<Department>;

const departmentSchema = new Schema<Department>(
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
      maxlength: 120,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    headId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    parentDepartmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
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

departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });
departmentSchema.index({ organizationId: 1, status: 1 });
departmentSchema.index({ organizationId: 1, parentDepartmentId: 1 });

export const DepartmentModel = model("Department", departmentSchema);
