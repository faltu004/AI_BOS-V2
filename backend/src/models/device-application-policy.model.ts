import {
  model,
  Schema,
  type HydratedDocument,
} from "mongoose";

export const applicationPolicyActions = [
  "block",
  "allow",
] as const;

export type ApplicationPolicyAction =
  (typeof applicationPolicyActions)[number];

export const applicationPolicyEnforcementStatuses = [
  "pending",
  "applied",
  "failed",
] as const;

export type ApplicationPolicyEnforcementStatus =
  (typeof applicationPolicyEnforcementStatuses)[number];

export type DeviceApplicationPolicyRule = {
  ruleId: string;
  deviceId: string;

  processName: string;
  processKey: string;

  displayName?: string;

  action: ApplicationPolicyAction;
  enabled: boolean;

  enforcementStatus: ApplicationPolicyEnforcementStatus;
  enforcementError?: string;
  enforcedAt?: Date;

  createdBy: string;
  updatedBy: string;
};

export type DeviceApplicationPolicyRuleDocument =
  HydratedDocument<DeviceApplicationPolicyRule>;

const deviceApplicationPolicyRuleSchema =
  new Schema<DeviceApplicationPolicyRule>(
    {
      ruleId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      deviceId: {
        type: String,
        required: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      processName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 128,
      },

      processKey: {
        type: String,
        required: true,
        trim: true,
        maxlength: 128,
      },

      displayName: {
        type: String,
        trim: true,
        maxlength: 200,
      },

      action: {
        type: String,
        required: true,
        enum: applicationPolicyActions,
        index: true,
      },

      enabled: {
        type: Boolean,
        default: true,
        index: true,
      },

      enforcementStatus: {
        type: String,
        enum: applicationPolicyEnforcementStatuses,
        default: "pending",
        index: true,
      },

      enforcementError: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      enforcedAt: {
        type: Date,
      },

      createdBy: {
        type: String,
        required: true,
        maxlength: 200,
      },

      updatedBy: {
        type: String,
        required: true,
        maxlength: 200,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

deviceApplicationPolicyRuleSchema.index(
  {
    deviceId: 1,
    processKey: 1,
  },
  {
    unique: true,
  },
);

deviceApplicationPolicyRuleSchema.index({
  deviceId: 1,
  action: 1,
  enabled: 1,
});

export const DeviceApplicationPolicyRuleModel =
  model(
    "DeviceApplicationPolicyRule",
    deviceApplicationPolicyRuleSchema,
  );
