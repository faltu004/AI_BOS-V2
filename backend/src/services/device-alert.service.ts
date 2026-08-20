import {
  notificationCategories,
  type NotificationCategory,
} from "../constants/notification.js";

import type {
  DeviceAlertCondition,
} from "../models/device-alert-state.model.js";

import {
  deviceAlertStateRepository,
} from "../repositories/device-alert-state.repository.js";

import {
  userRepository,
} from "../repositories/user.repository.js";

import {
  notificationService,
} from "./notification.service.js";

import {
  logger,
} from "../utils/logger.js";

type OpenDeviceAlertInput = {
  deviceId: string;

  hostname: string;

  condition:
    DeviceAlertCondition;

  title: string;

  body: string;

  latestValue?: number;

  threshold?: number;
};

type ResolveDeviceAlertInput = {
  deviceId: string;

  hostname: string;

  condition:
    DeviceAlertCondition;

  title: string;

  body: string;
};

function alertCategory():
  NotificationCategory {
  const preferred = [
    "System",
    "Security",
    "Operations",
    "General",
  ];

  for (
    const requested of
    preferred
  ) {
    const match =
      notificationCategories
        .find(
          (
            item,
          ) =>
            item.toLowerCase() ===
            requested.toLowerCase(),
        );

    if (match) {
      return match;
    }
  }

  const fallback =
    notificationCategories[0];

  if (!fallback) {
    throw new Error(
      "No notification category is configured.",
    );
  }

  return fallback;
}

async function alertRecipients():
  Promise<string[]> {
  const users =
    await userRepository
      .findActiveByRoles([
        "Owner",
        "Administrator",
      ]);

  return users.map(
    (
      user,
    ) =>
      (
        user._id as {
          toString():
            string;
        }
      ).toString(),
  );
}

export class DeviceAlertService {
  async open(
    input:
      OpenDeviceAlertInput,
  ) {
    const observedAt =
      new Date();

    const result =
      await deviceAlertStateRepository
        .claimOpen({
          deviceId:
            input.deviceId,

          condition:
            input.condition,

          latestValue:
            input.latestValue,

          threshold:
            input.threshold,

          observedAt,
        });

    const shouldNotify =
      result.claimed ||
      !result.state
        ?.lastNotifiedAt;

    if (
      !shouldNotify
    ) {
      return {
        created:
          false,

        notified:
          false,

        state:
          result.state,
      };
    }

    const recipients =
      await alertRecipients();

    if (
      recipients.length ===
      0
    ) {
      logger.warn(
        "Device alert opened but no active Owner or Administrator recipient exists: " +
          input.deviceId +
          " / " +
          input.condition,
      );

      return {
        created:
          true,

        notified:
          false,

        state:
          result.state,
      };
    }

    await notificationService
      .dispatch({
        recipientUserIds:
          recipients,

        type:
          "device_alert_open",

        category:
          alertCategory(),

        priority:
          "Medium",

        title:
          input.title,

        body:
          input.body,

        sourceType:
          "managed_device_alert",

        sourceId:
          input.deviceId +
          ":" +
          input.condition,

        metadata: {
          deviceId:
            input.deviceId,

          hostname:
            input.hostname,

          condition:
            input.condition,

          latestValue:
            input.latestValue,

          threshold:
            input.threshold,

          status:
            "open",
        },
      });

    await deviceAlertStateRepository
      .markNotified(
        input.deviceId,
        input.condition,
        new Date(),
      );

    return {
      created:
        true,

      notified:
        true,

      state:
        result.state,
    };
  }

  async resolve(
    input:
      ResolveDeviceAlertInput,
  ) {
    const resolved =
      await deviceAlertStateRepository
        .resolveOpen(
          input.deviceId,
          input.condition,
          new Date(),
        );

    if (!resolved) {
      return {
        resolved:
          false,

        notified:
          false,
      };
    }

    const recipients =
      await alertRecipients();

    if (
      recipients.length ===
      0
    ) {
      return {
        resolved:
          true,

        notified:
          false,
      };
    }

    await notificationService
      .dispatch({
        recipientUserIds:
          recipients,

        type:
          "device_alert_recovered",

        category:
          alertCategory(),

        priority:
          "Medium",

        title:
          input.title,

        body:
          input.body,

        sourceType:
          "managed_device_alert",

        sourceId:
          input.deviceId +
          ":" +
          input.condition,

        metadata: {
          deviceId:
            input.deviceId,

          hostname:
            input.hostname,

          condition:
            input.condition,

          status:
            "resolved",
        },
      });

    await deviceAlertStateRepository
      .markNotified(
        input.deviceId,
        input.condition,
        new Date(),
      );

    return {
      resolved:
        true,

      notified:
        true,
    };
  }
}

export const deviceAlertService =
  new DeviceAlertService();
