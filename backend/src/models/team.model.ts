import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import { departmentStatuses, type DepartmentStatus } from "../constants/department.js";

export type Team = {
  organizationId: Types.ObjectId;
  name: string;
  departmentId: Types.ObjectId;
  leadId?: Types.ObjectId;
  memberIds: Types.ObjectId[];
  description?: string;
  status: DepartmentStatus;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TeamDocument = HydratedDocument<Team>;

const teamSchema = new Schema<Team>(
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
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
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

teamSchema.index({ organizationId: 1, name: 1 }, { unique: true });
teamSchema.index({ organizationId: 1, departmentId: 1 });

export const TeamModel = model("Team", teamSchema);
