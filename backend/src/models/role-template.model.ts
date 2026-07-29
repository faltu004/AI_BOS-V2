import { model, Schema, type HydratedDocument } from "mongoose";

export type RoleTemplate = {
  name: string;
  description?: string;
  permissionKeys: string[];
  basedOnSystemRole?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleTemplateDocument = HydratedDocument<RoleTemplate>;

const roleTemplateSchema = new Schema<RoleTemplate>(
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
    basedOnSystemRole: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const RoleTemplateModel = model("RoleTemplate", roleTemplateSchema);
