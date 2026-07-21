import { Schema, model, type HydratedDocument } from "mongoose";

export type VoiceInteraction = {
  userId: string;
  sessionId: string;
  text: string;
  command?: string;
  action?: string;
  confidence?: number;
  duration?: number;
  success: boolean;
  createdAt: Date;
};

export type VoiceInteractionDocument = HydratedDocument<VoiceInteraction>;

const voiceInteractionSchema = new Schema<VoiceInteraction>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    command: { type: String, trim: true, maxlength: 100 },
    action: { type: String, trim: true, maxlength: 100 },
    confidence: { type: Number, min: 0, max: 1 },
    duration: { type: Number, min: 0 },
    success: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

voiceInteractionSchema.index({ userId: 1, createdAt: -1 });
voiceInteractionSchema.index({ sessionId: 1 });

export const VoiceInteractionModel = model("VoiceInteraction", voiceInteractionSchema);