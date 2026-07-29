import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type LoginEventType = "login_success" | "login_failure" | "logout" | "token_refresh" | "password_change" | "suspicious";

export type LoginHistory = {
  user: Types.ObjectId;
  eventType: LoginEventType;
  ip?: string;
  userAgent?: string;
  deviceId?: Types.ObjectId;
  location?: string;
  metadata: Record<string, unknown>;
  failureReason?: string;
};

export type LoginHistoryDocument = HydratedDocument<LoginHistory>;

const loginHistorySchema = new Schema<LoginHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventType: { type: String, enum: ["login_success", "login_failure", "logout", "token_refresh", "password_change", "suspicious"], required: true, index: true },
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 512 },
    deviceId: { type: Schema.Types.ObjectId, ref: "Device", index: true },
    location: { type: String, maxlength: 160 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    failureReason: { type: String, maxlength: 240 },
  },
  { timestamps: true, versionKey: false },
);

loginHistorySchema.index({ user: 1, createdAt: -1 });

export const LoginHistoryModel = model("LoginHistory", loginHistorySchema);
