import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import {
  integrationFamilies,
  integrationKeys,
  integrationStatuses,
  integrationSyncFrequencies,
  type IntegrationFamily,
  type IntegrationKey,
  type IntegrationStatus,
  type IntegrationSyncFrequency,
} from "../constants/integration.js";

export type Integration = {
  organizationId: Types.ObjectId;
  integrationKey: IntegrationKey;
  family: IntegrationFamily;
  status: IntegrationStatus;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  grantedScopes: string[];
  autoSyncEnabled: boolean;
  syncFrequency: IntegrationSyncFrequency;
  lastSyncAt?: Date;
  lastSyncStatus?: "success" | "error";
  lastSyncSummary?: string;
  connectedBy?: Types.ObjectId;
  connectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationDocument = HydratedDocument<Integration>;

const integrationSchema = new Schema<Integration>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    integrationKey: {
      type: String,
      enum: integrationKeys,
      required: true,
    },
    family: {
      type: String,
      enum: integrationFamilies,
      required: true,
    },
    status: {
      type: String,
      enum: integrationStatuses,
      default: "disconnected",
    },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    grantedScopes: [{ type: String }],
    autoSyncEnabled: {
      type: Boolean,
      default: false,
    },
    syncFrequency: {
      type: String,
      enum: integrationSyncFrequencies,
      default: "manual",
    },
    lastSyncAt: { type: Date },
    lastSyncStatus: { type: String, enum: ["success", "error"] },
    lastSyncSummary: { type: String, maxlength: 500 },
    connectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    connectedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

integrationSchema.index({ organizationId: 1, integrationKey: 1 }, { unique: true });
integrationSchema.index({ status: 1, autoSyncEnabled: 1 });

export const IntegrationModel = model("Integration", integrationSchema);
