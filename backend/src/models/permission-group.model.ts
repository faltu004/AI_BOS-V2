import { model, Schema, type HydratedDocument } from "mongoose";

export type PermissionGroup = {
  name: string;
  description?: string;
  permissionKeys: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type PermissionGroupDocument = HydratedDocument<PermissionGroup>;

const permissionGroupSchema = new Schema<PermissionGroup>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    permissionKeys: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const PermissionGroupModel = model("PermissionGroup", permissionGroupSchema);
