import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import { auditCategories, type AuditCategory } from "../constants/audit.js";

export type AuditLog = {
  actorUserId?: Types.ObjectId;
  actorEmail?: string;
  actorRole?: string;
  category: AuditCategory;
  method: string;
  path: string;
  resourceType?: string;
  resourceId?: string;
  statusCode: number;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type AuditLogDocument = HydratedDocument<AuditLog>;

const auditLogSchema = new Schema<AuditLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    actorEmail: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    category: { type: String, enum: auditCategories, required: true },
    method: { type: String, required: true, maxlength: 10 },
    path: { type: String, required: true, maxlength: 300 },
    resourceType: { type: String, trim: true, maxlength: 60 },
    resourceId: { type: String, trim: true, maxlength: 120 },
    statusCode: { type: Number, required: true },
    success: { type: Boolean, required: true },
    ipAddress: { type: String, maxlength: 60 },
    userAgent: { type: String, maxlength: 300 },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ path: "text" });

export const AuditLogModel = model("AuditLog", auditLogSchema);
