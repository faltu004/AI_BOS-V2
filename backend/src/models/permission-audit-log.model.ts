import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export const permissionAuditActions = [
  "role.create",
  "role.update",
  "role.delete",
  "permission_group.create",
  "permission_group.update",
  "permission_group.delete",
  "role_template.create",
  "role_template.update",
  "role_template.delete",
] as const;

export type PermissionAuditAction = (typeof permissionAuditActions)[number];

export const permissionAuditTargetTypes = ["Role", "PermissionGroup", "RoleTemplate"] as const;
export type PermissionAuditTargetType = (typeof permissionAuditTargetTypes)[number];

export type PermissionAuditLog = {
  actorUserId: Types.ObjectId;
  action: PermissionAuditAction;
  targetType: PermissionAuditTargetType;
  targetId: Types.ObjectId;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type PermissionAuditLogDocument = HydratedDocument<PermissionAuditLog>;

const permissionAuditLogSchema = new Schema<PermissionAuditLog>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: permissionAuditActions,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: permissionAuditTargetTypes,
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

permissionAuditLogSchema.index({ createdAt: -1 });

export const PermissionAuditLogModel = model("PermissionAuditLog", permissionAuditLogSchema);
