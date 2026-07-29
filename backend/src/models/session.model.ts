import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type SessionStatus = "active" | "revoked" | "expired";

export type Session = {
  user: Types.ObjectId;
  refreshTokenJti: string;
  status: SessionStatus;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
  deviceId?: Types.ObjectId;
};

export type SessionDocument = HydratedDocument<Session>;

const sessionSchema = new Schema<Session>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenJti: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "revoked", "expired"], default: "active", index: true },
    expiresAt: { type: Date, required: true, index: true },
    userAgent: { type: String, maxlength: 512 },
    ip: { type: String, maxlength: 64 },
    deviceId: { type: Schema.Types.ObjectId, ref: "Device", index: true },
  },
  { timestamps: true, versionKey: false },
);

sessionSchema.index({ user: 1, status: 1, expiresAt: 1 });

export const SessionModel = model("Session", sessionSchema);
