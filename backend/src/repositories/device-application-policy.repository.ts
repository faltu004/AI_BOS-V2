import {
  DeviceApplicationPolicyRuleModel,
  type ApplicationPolicyAction,
  type ApplicationPolicyEnforcementStatus,
} from "../models/device-application-policy.model.js";

export type UpsertApplicationPolicyRuleInput = {
  ruleId: string;
  deviceId: string;

  processName: string;
  processKey: string;

  displayName?: string;

  action: ApplicationPolicyAction;
    enabled: boolean;

    enforcementStatus?: ApplicationPolicyEnforcementStatus;

  requestedBy: string;
};

export class DeviceApplicationPolicyRepository {
  async findByDeviceId(
    deviceId: string,
  ) {
    return DeviceApplicationPolicyRuleModel
      .find({
        deviceId,
      })
      .sort({
        processName: 1,
      })
      .lean();
  }

  async findBlockedByDeviceId(
    deviceId: string,
  ) {
    return DeviceApplicationPolicyRuleModel
      .find({
        deviceId,
        action: "block",
        enabled: true,
      })
      .sort({
        processName: 1,
      })
      .lean();
  }

  async upsertRule(
    input: UpsertApplicationPolicyRuleInput,
  ) {
    return DeviceApplicationPolicyRuleModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,

          processKey:
            input.processKey,
        },
        {
          $set: {
            processName:
              input.processName,

            displayName:
              input.displayName,

            action:
              input.action,

            enabled:
              input.enabled,

            enforcementStatus:
              "pending",

            enforcementError:
              undefined,

            enforcedAt:
              undefined,

            updatedBy:
              input.requestedBy,
          },

          $setOnInsert: {
            ruleId:
              input.ruleId,

            deviceId:
              input.deviceId,

            processKey:
              input.processKey,

            createdBy:
              input.requestedBy,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean();
  }

  async updateEnforcementStatus(
    deviceId: string,
    status: ApplicationPolicyEnforcementStatus,
    errorMessage?: string,
  ) {
    return DeviceApplicationPolicyRuleModel
      .updateMany(
        {
          deviceId,
          enabled: true,
        },
        {
          $set: {
            enforcementStatus: status,
            enforcementError: errorMessage || undefined,
            enforcedAt:
              status === "applied"
                ? new Date()
                : undefined,
          },
        },
      );
  }
}

export const deviceApplicationPolicyRepository =
  new DeviceApplicationPolicyRepository();
