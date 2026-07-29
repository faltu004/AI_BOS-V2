import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type DeviceTrustStatus = "trusted" | "untrusted" | "flagged";

export type Device = {
  user: Types.ObjectId;
  name: string;
  fingerprint: string;
  userAgent?: string;
  lastIp?: string;
  lastSeenAt?: Date;
  trustStatus: DeviceTrustStatus;
  isActive: boolean;
};

export type DeviceDocument = HydratedDocument<Device>;

const deviceSchema = new Schema<Device>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, maxlength: 160 },
    fingerprint: { type: String, required: true, maxlength: 256 },
    userAgent: { type: String, maxlength: 512 },
    lastIp: { type: String, maxlength: 64 },
    lastSeenAt: { type: Date },
    trustStatus: { type: String, enum: ["trusted", "untrusted", "flagged"], default: "untrusted", index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

deviceSchema.index({ user: 1, fingerprint: 1 }, { unique: true });

export const DeviceModel = model("Device", deviceSchema);
