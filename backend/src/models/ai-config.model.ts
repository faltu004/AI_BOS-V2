import { model, Schema, type HydratedDocument } from "mongoose";
import { aiConfigScope, aiProviders, type AIProvider } from "../constants/ai-config.js";

export type AIFeatureFlags = {
  streaming: boolean;
  memory: boolean;
  rag: boolean;
  ocr: boolean;
  voice: boolean;
};

export type AIConfig = {
  scope: typeof aiConfigScope;
  provider: AIProvider;
  apiKeys: Partial<Record<AIProvider, string>>;
  defaultModel: string;
  embeddingModel: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  features: AIFeatureFlags;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AIConfigDocument = HydratedDocument<AIConfig>;

const aiConfigSchema = new Schema<AIConfig>(
  {
    scope: {
      type: String,
      default: aiConfigScope,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: aiProviders,
      default: "OpenAI",
    },
    apiKeys: {
      type: Map,
      of: String,
      default: {},
      select: false,
    },
    defaultModel: {
      type: String,
      default: "gpt-4o-mini",
      trim: true,
      maxlength: 120,
    },
    embeddingModel: {
      type: String,
      default: "text-embedding-3-small",
      trim: true,
      maxlength: 120,
    },
    temperature: {
      type: Number,
      default: 0.2,
      min: 0,
      max: 2,
    },
    maxTokens: {
      type: Number,
      default: 4096,
      min: 256,
      max: 200000,
    },
    contextWindow: {
      type: Number,
      default: 128000,
      min: 1024,
      max: 2000000,
    },
    features: {
      streaming: { type: Boolean, default: true },
      memory: { type: Boolean, default: true },
      rag: { type: Boolean, default: true },
      ocr: { type: Boolean, default: false },
      voice: { type: Boolean, default: false },
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const AIConfigModel = model("AIConfig", aiConfigSchema);
