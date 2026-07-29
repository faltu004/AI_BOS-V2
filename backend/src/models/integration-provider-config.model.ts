import { model, Schema, type HydratedDocument } from "mongoose";
import { integrationFamilies, type IntegrationFamily } from "../constants/integration.js";

export type IntegrationProviderConfig = {
  family: IntegrationFamily;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  isEnabled: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationProviderConfigDocument = HydratedDocument<IntegrationProviderConfig>;

const integrationProviderConfigSchema = new Schema<IntegrationProviderConfig>(
  {
    family: {
      type: String,
      enum: integrationFamilies,
      unique: true,
      required: true,
    },
    clientId: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    clientSecret: {
      type: String,
      select: false,
    },
    redirectUri: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    isEnabled: {
      type: Boolean,
      default: false,
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

export const IntegrationProviderConfigModel = model("IntegrationProviderConfig", integrationProviderConfigSchema);
