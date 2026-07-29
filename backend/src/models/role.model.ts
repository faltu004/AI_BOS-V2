import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type Role = {
  slug: string;
  name: string;
  description?: string;
  isSystem: boolean;
  hasFullAccess: boolean;
  rank: number;
  permissionKeys: string[];
  templateId?: Types.ObjectId;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleDocument = HydratedDocument<Role>;

const roleSchema = new Schema<Role>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    hasFullAccess: {
      type: Boolean,
      default: false,
    },
    rank: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    permissionKeys: {
      type: [String],
      default: [],
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "RoleTemplate",
    },
    isActive: {
      type: Boolean,
      default: true,
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

export const RoleModel = model("Role", roleSchema);
