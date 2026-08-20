import {
  DeviceAlertStateModel,
  type DeviceAlertCondition,
} from "../models/device-alert-state.model.js";

type ClaimAlertInput = {
  deviceId: string;

  condition:
    DeviceAlertCondition;

  latestValue?: number;

  threshold?: number;

  observedAt: Date;
};

function isDuplicateKey(
  error: unknown,
): boolean {
  if (
    typeof error !==
      "object" ||
    error === null
  ) {
    return false;
  }

  return (
    (
      error as {
        code?: unknown;
      }
    ).code ===
    11000
  );
}

export class DeviceAlertStateRepository {
  async find(
    deviceId: string,
    condition:
      DeviceAlertCondition,
  ) {
    return DeviceAlertStateModel
      .findOne({
        deviceId,
        condition,
      });
  }

  async claimOpen(
    input:
      ClaimAlertInput,
  ) {
    const reopened =
      await DeviceAlertStateModel
        .findOneAndUpdate(
          {
            deviceId:
              input.deviceId,

            condition:
              input.condition,

            status:
              "resolved",
          },
          {
            $set: {
              status:
                "open",

              openedAt:
                input.observedAt,

              lastObservedAt:
                input.observedAt,

              latestValue:
                input.latestValue,

              threshold:
                input.threshold,
            },

            $unset: {
              resolvedAt: 1,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        );

    if (reopened) {
      return {
        claimed:
          true,

        state:
          reopened,
      };
    }

    try {
      const created =
        await DeviceAlertStateModel
          .create({
            deviceId:
              input.deviceId,

            condition:
              input.condition,

            status:
              "open",

            openedAt:
              input.observedAt,

            lastObservedAt:
              input.observedAt,

            latestValue:
              input.latestValue,

            threshold:
              input.threshold,

            notificationCount:
              0,
          });

      return {
        claimed:
          true,

        state:
          created,
      };
    } catch (
      error
    ) {
      if (
        !isDuplicateKey(
          error,
        )
      ) {
        throw error;
      }
    }

    const existing =
      await DeviceAlertStateModel
        .findOneAndUpdate(
          {
            deviceId:
              input.deviceId,

            condition:
              input.condition,

            status:
              "open",
          },
          {
            $set: {
              lastObservedAt:
                input.observedAt,

              latestValue:
                input.latestValue,

              threshold:
                input.threshold,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        );

    return {
      claimed:
        false,

      state:
        existing,
    };
  }

  async touchOpen(
    input:
      ClaimAlertInput,
  ) {
    return DeviceAlertStateModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,

          condition:
            input.condition,

          status:
            "open",
        },
        {
          $set: {
            lastObservedAt:
              input.observedAt,

            latestValue:
              input.latestValue,

            threshold:
              input.threshold,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
  }

  async resolveOpen(
    deviceId: string,
    condition:
      DeviceAlertCondition,
    resolvedAt: Date,
  ) {
    return DeviceAlertStateModel
      .findOneAndUpdate(
        {
          deviceId,
          condition,
          status:
            "open",
        },
        {
          $set: {
            status:
              "resolved",

            resolvedAt,

            lastObservedAt:
              resolvedAt,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
  }

  async markNotified(
    deviceId: string,
    condition:
      DeviceAlertCondition,
    notifiedAt: Date,
  ) {
    return DeviceAlertStateModel
      .findOneAndUpdate(
        {
          deviceId,
          condition,
        },
        {
          $set: {
            lastNotifiedAt:
              notifiedAt,
          },

          $inc: {
            notificationCount:
              1,
          },
        },
        {
          new: true,
        },
      );
  }

  async findById(
    id: string,
  ) {
    return DeviceAlertStateModel
      .findById(
        id,
      );
  }

  async acknowledge(
    id: string,
    acknowledgedBy: string,
    acknowledgedByName: string,
    acknowledgedAt: Date,
  ) {
    return DeviceAlertStateModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            acknowledgedAt,
            acknowledgedBy,
            acknowledgedByName,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
  }

  async findRecentResolved(
    limit: number,
  ) {
    return DeviceAlertStateModel
      .find({
        status:
          "resolved",
      })
      .sort({
        resolvedAt: -1,
      })
      .limit(
        limit,
      )
      .lean();
  }
}

export const deviceAlertStateRepository =
  new DeviceAlertStateRepository();
