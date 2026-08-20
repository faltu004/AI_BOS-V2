import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

import {
  deviceAlertEvaluatorService,
} from "../services/device-alert-evaluator.service.js";

import {
  logger,
} from "../utils/logger.js";

const OFFLINE_AFTER_MS =
  90 * 1000;

const CHECK_INTERVAL_MS =
  30 * 1000;

const RESOURCE_CHECK_INTERVAL_MS =
  60 * 1000;

/*
 * Give endpoint agents time to reconnect after the backend itself
 * restarts. Without this grace period, stale lastSeenAt values from
 * backend downtime can create a false offline -> recovered alert storm.
 */
const STARTUP_GRACE_MS =
  90 * 1000;

let schedulerTimer:
  | ReturnType<
      typeof setInterval
    >
  | undefined;

let schedulerStartedAt:
  number |
  undefined;

let sweepRunning =
  false;

let lastResourceSweepAt =
  0;

async function runManagedDeviceSweep():
  Promise<void> {
  if (sweepRunning) {
    return;
  }

  sweepRunning =
    true;

  try {
    const now =
      Date.now();

    const startupGraceActive =
      schedulerStartedAt !==
        undefined &&
      now -
        schedulerStartedAt <
        STARTUP_GRACE_MS;

    if (
      startupGraceActive
    ) {
      return;
    }

    const inactiveBefore =
      new Date(
        now -
          OFFLINE_AFTER_MS,
      );

    const result =
      await managedDeviceRepository
        .markInactiveDevicesOffline(
          inactiveBefore,
        );

    if (
      result.modifiedCount >
      0
    ) {
      logger.info(
        "Marked " +
          result.modifiedCount +
          " managed device(s) offline",
      );
    }

    await deviceAlertEvaluatorService
      .evaluateConnectivityAlerts();

    if (
      now -
        lastResourceSweepAt >=
      RESOURCE_CHECK_INTERVAL_MS
    ) {
      lastResourceSweepAt =
        now;

      await deviceAlertEvaluatorService
        .evaluateResourceAlerts();
    }
  } catch (
    error
  ) {
    logger.error(
      error,
      "Managed device monitoring sweep failed",
    );
  } finally {
    sweepRunning =
      false;
  }
}

export function startManagedDeviceStatusScheduler():
  void {
  if (schedulerTimer) {
    return;
  }

  schedulerStartedAt =
    Date.now();

  lastResourceSweepAt =
    0;

  logger.info(
    "Managed device alert startup grace active for 90 seconds",
  );

  void runManagedDeviceSweep();

  schedulerTimer =
    setInterval(
      () => {
        void runManagedDeviceSweep();
      },
      CHECK_INTERVAL_MS,
    );

  logger.info(
    "Managed device status + automatic alert scheduler started",
  );
}

export function stopManagedDeviceStatusScheduler():
  void {
  if (!schedulerTimer) {
    return;
  }

  clearInterval(
    schedulerTimer,
  );

  schedulerTimer =
    undefined;

  schedulerStartedAt =
    undefined;

  lastResourceSweepAt =
    0;

  logger.info(
    "Managed device status + automatic alert scheduler stopped",
  );
}
