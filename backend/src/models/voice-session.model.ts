import { Schema, model, type HydratedDocument } from "mongoose";

export type VoiceSession = {
  userId: string;
  sessionId: string;
  isActive: boolean;
  startedAt: Date;
  expiresAt: Date;
  deviceInfo?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type VoiceSessionDocument = HydratedDocument<VoiceSession>;

const voiceSessionSchema = new Schema<VoiceSession>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    deviceInfo: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

voiceSessionSchema.index({ userId: 1, isActive: 1 });

export const VoiceSessionModel = model("VoiceSession", voiceSessionSchema);