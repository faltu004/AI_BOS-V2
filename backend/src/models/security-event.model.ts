import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type SecurityEventSeverity = "low" | "medium" | "high" | "critical";

export type SecurityEvent = {
  user?: Types.ObjectId;
  eventType: string;
  severity: SecurityEventSeverity;
  ip?: string;
  userAgent?: string;
  deviceId?: Types.ObjectId;
  description: string;
  metadata: Record<string, unknown>;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
};

export type SecurityEventDocument = HydratedDocument<SecurityEvent>;

const securityEventSchema = new Schema<SecurityEvent>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    eventType: { type: String, required: true, index: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true, index: true },
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 512 },
    deviceId: { type: Schema.Types.ObjectId, ref: "Device", index: true },
    description: { type: String, required: true, maxlength: 400 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });

export const SecurityEventModel = model("SecurityEvent", securityEventSchema);
