import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import {
  integrationKeys,
  integrationLogActions,
  integrationLogStatuses,
  type IntegrationKey,
  type IntegrationLogAction,
  type IntegrationLogStatus,
} from "../constants/integration.js";

export type IntegrationLog = {
  organizationId: Types.ObjectId;
  integrationKey: IntegrationKey;
  action: IntegrationLogAction;
  status: IntegrationLogStatus;
  message: string;
  createdAt: Date;
};

export type IntegrationLogDocument = HydratedDocument<IntegrationLog>;

const integrationLogSchema = new Schema<IntegrationLog>(
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
      index: true,
    },
    action: {
      type: String,
      enum: integrationLogActions,
      required: true,
    },
    status: {
      type: String,
      enum: integrationLogStatuses,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

integrationLogSchema.index({ organizationId: 1, integrationKey: 1, createdAt: -1 });

export const IntegrationLogModel = model("IntegrationLog", integrationLogSchema);
