import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type RoleHistory = {
  roleId: Types.ObjectId;
  version: number;
  permissionKeys: string[];
  changedBy: Types.ObjectId;
  changeNote?: string;
  createdAt: Date;
};

export type RoleHistoryDocument = HydratedDocument<RoleHistory>;

const roleHistorySchema = new Schema<RoleHistory>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    permissionKeys: {
      type: [String],
      default: [],
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changeNote: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

roleHistorySchema.index({ roleId: 1, version: -1 });

export const RoleHistoryModel = model("RoleHistory", roleHistorySchema);
