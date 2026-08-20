import {
  deviceMetricRepository,
} from "../repositories/device-metric.repository.js";

import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

import {
  deviceAlertService,
} from "./device-alert.service.js";

import {
  logger,
} from "../utils/logger.js";

const RESOURCE_WINDOW_MS =
  5 * 60 * 1000;

const REQUIRED_SAMPLES =
  3;

const MIN_SAMPLE_SPAN_MS =
  60 * 1000;

const CPU_ALERT_THRESHOLD =
  90;

const CPU_RECOVERY_THRESHOLD =
  75;

const MEMORY_ALERT_THRESHOLD =
  90;

const MEMORY_RECOVERY_THRESHOLD =
  80;

type MetricSample = {
  value: number;
  recordedAt: Date;
};

function rounded(
  value: number,
): number {
  return (
    Math.round(
      value * 10,
    ) / 10
  );
}

function hasSustainedSpan(
  samples:
    MetricSample[],
): boolean {
  if (
    samples.length <
    REQUIRED_SAMPLES
  ) {
    return false;
  }

  const selected =
    samples.slice(
      -REQUIRED_SAMPLES,
    );

  const first =
    selected[0];

  const last =
    selected[
      selected.length - 1
    ];

  if (
    !first ||
    !last
  ) {
    return false;
  }

  return (
    last.recordedAt
      .getTime() -
      first.recordedAt
        .getTime() >=
    MIN_SAMPLE_SPAN_MS
  );
}

function recentSamples(
  values:
    Array<{
      value:
        unknown;

      recordedAt:
        unknown;
    }>,
): MetricSample[] {
  return values
    .filter(
      (
        item,
      ) =>
        typeof item.value ===
          "number" &&
        Number.isFinite(
          item.value,
        ),
    )
    .map(
      (
        item,
      ) => ({
        value:
          item.value as
            number,

        recordedAt:
          new Date(
            item.recordedAt as
              Date,
          ),
      }),
    )
    .filter(
      (
        item,
      ) =>
        !Number.isNaN(
          item.recordedAt
            .getTime(),
        ),
    )
    .slice(
      -REQUIRED_SAMPLES,
    );
}

export class DeviceAlertEvaluatorService {
  async evaluateConnectivityAlerts():
    Promise<void> {
    const devices =
      await managedDeviceRepository
        .findAll();

    for (
      const device of
      devices
    ) {
      try {
        const hostname =
          device.hostname ||
          device.deviceId;

        if (
          device.status ===
          "offline"
        ) {
          const lastSeen =
            device.lastSeenAt
              ? new Date(
                  device.lastSeenAt,
                )
              : null;

          const lastSeenText =
            lastSeen
              ? lastSeen
                  .toISOString()
              : "unknown";

          await deviceAlertService
            .open({
              deviceId:
                device.deviceId,

              hostname,

              condition:
                "offline",

              title:
                "Device offline: " +
                hostname,

              body:
                hostname +
                " is offline. Last heartbeat: " +
                lastSeenText +
                ".",
            });

          continue;
        }

        if (
          device.status ===
          "online"
        ) {
          await deviceAlertService
            .resolve({
              deviceId:
                device.deviceId,

              hostname,

              condition:
                "offline",

              title:
                "Device recovered: " +
                hostname,

              body:
                hostname +
                " is back online and sending heartbeats.",
            });

          continue;
        }

        if (
          device.status ===
          "disabled"
        ) {
          await deviceAlertService
            .resolve({
              deviceId:
                device.deviceId,

              hostname,

              condition:
                "offline",

              title:
                "Offline alert cleared: " +
                hostname,

              body:
                hostname +
                " monitoring is disabled, so its offline alert was cleared.",
            });
        }
      } catch (
        error
      ) {
        logger.error(
          error,
          "Failed to evaluate connectivity alert for device " +
            device.deviceId,
        );
      }
    }
  }

  async evaluateResourceAlerts():
    Promise<void> {
    const devices =
      await managedDeviceRepository
        .findAll();

    const since =
      new Date(
        Date.now() -
          RESOURCE_WINDOW_MS,
      );

    for (
      const device of
      devices
    ) {
      if (
        device.status !==
        "online"
      ) {
        continue;
      }

      try {
        const metrics =
          await deviceMetricRepository
            .findSince(
              device.deviceId,
              since,
            );

        const cpuSamples =
          recentSamples(
            metrics.map(
              (
                item,
              ) => ({
                value:
                  item.cpuUsage,

                recordedAt:
                  item.recordedAt,
              }),
            ),
          );

        const memorySamples =
          recentSamples(
            metrics.map(
              (
                item,
              ) => ({
                value:
                  item.ramUsage,

                recordedAt:
                  item.recordedAt,
              }),
            ),
          );

        const hostname =
          device.hostname ||
          device.deviceId;

        await this
          .evaluateCpu(
            device.deviceId,
            hostname,
            cpuSamples,
          );

        await this
          .evaluateMemory(
            device.deviceId,
            hostname,
            memorySamples,
          );
      } catch (
        error
      ) {
        logger.error(
          error,
          "Failed to evaluate resource alerts for device " +
            device.deviceId,
        );
      }
    }
  }

  private async evaluateCpu(
    deviceId: string,
    hostname: string,
    samples:
      MetricSample[],
  ): Promise<void> {
    if (
      !hasSustainedSpan(
        samples,
      )
    ) {
      return;
    }

    const selected =
      samples.slice(
        -REQUIRED_SAMPLES,
      );

    const latest =
      selected[
        selected.length - 1
      ];

    if (!latest) {
      return;
    }

    if (
      selected.every(
        (
          item,
        ) =>
          item.value >=
          CPU_ALERT_THRESHOLD,
      )
    ) {
      await deviceAlertService
        .open({
          deviceId,

          hostname,

          condition:
            "high_cpu",

          title:
            "High CPU usage: " +
            hostname,

          body:
            hostname +
            " has sustained CPU usage at or above " +
            CPU_ALERT_THRESHOLD +
            "%. Latest value: " +
            rounded(
              latest.value,
            ) +
            "%.",

          latestValue:
            latest.value,

          threshold:
            CPU_ALERT_THRESHOLD,
        });

      return;
    }

    if (
      selected.every(
        (
          item,
        ) =>
          item.value <=
          CPU_RECOVERY_THRESHOLD,
      )
    ) {
      await deviceAlertService
        .resolve({
          deviceId,

          hostname,

          condition:
            "high_cpu",

          title:
            "CPU usage recovered: " +
            hostname,

          body:
            hostname +
            " CPU usage returned to a healthy range. Latest value: " +
            rounded(
              latest.value,
            ) +
            "%.",
        });
    }
  }

  private async evaluateMemory(
    deviceId: string,
    hostname: string,
    samples:
      MetricSample[],
  ): Promise<void> {
    if (
      !hasSustainedSpan(
        samples,
      )
    ) {
      return;
    }

    const selected =
      samples.slice(
        -REQUIRED_SAMPLES,
      );

    const latest =
      selected[
        selected.length - 1
      ];

    if (!latest) {
      return;
    }

    if (
      selected.every(
        (
          item,
        ) =>
          item.value >=
          MEMORY_ALERT_THRESHOLD,
      )
    ) {
      await deviceAlertService
        .open({
          deviceId,

          hostname,

          condition:
            "high_memory",

          title:
            "High memory usage: " +
            hostname,

          body:
            hostname +
            " has sustained memory usage at or above " +
            MEMORY_ALERT_THRESHOLD +
            "%. Latest value: " +
            rounded(
              latest.value,
            ) +
            "%.",

          latestValue:
            latest.value,

          threshold:
            MEMORY_ALERT_THRESHOLD,
        });

      return;
    }

    if (
      selected.every(
        (
          item,
        ) =>
          item.value <=
          MEMORY_RECOVERY_THRESHOLD,
      )
    ) {
      await deviceAlertService
        .resolve({
          deviceId,

          hostname,

          condition:
            "high_memory",

          title:
            "Memory usage recovered: " +
            hostname,

          body:
            hostname +
            " memory usage returned to a healthy range. Latest value: " +
            rounded(
              latest.value,
            ) +
            "%.",
        });
    }
  }
}

export const deviceAlertEvaluatorService =
  new DeviceAlertEvaluatorService();
