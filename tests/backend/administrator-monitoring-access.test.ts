import test from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
} from "node:http";

import {
  configureBackendTestEnv,
} from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("per-Administrator master and granular permissions are resolved without role full-access bypass", async () => {
  const {
    AdministratorMonitoringAccessModel,
  } =
    await import(
      "../../backend/src/models/administrator-monitoring-access.model.ts"
    );
  const {
    administratorMonitoringAccessService,
  } =
    await import(
      "../../backend/src/services/administrator-monitoring-access.service.ts"
    );

  const originalFindOne =
    AdministratorMonitoringAccessModel.findOne;

  const policies =
    new Map<string, {
      enabled: boolean;
      permissionKeys: string[];
    }>([
      [
        "admin-enabled",
        {
          enabled: true,
          permissionKeys: [
            "device.monitoring.view",
          ],
        },
      ],
      [
        "admin-revoked",
        {
          enabled: false,
          permissionKeys: [
            "device.monitoring.view",
            "device.command.execute",
          ],
        },
      ],
    ]);

  AdministratorMonitoringAccessModel.findOne =
    ((filter: {
      administratorUserId: string;
    }) => ({
      select: () => ({
        lean: async () =>
          policies.get(
            String(
              filter.administratorUserId,
            ),
          ) ?? null,
      }),
    })) as any;

  try {
    assert.equal(
      await administratorMonitoringAccessService
        .hasPermission(
          "owner-user",
          "Owner",
          "device.remote_support.control",
        ),
      true,
    );
    assert.equal(
      await administratorMonitoringAccessService
        .hasPermission(
          "admin-enabled",
          "Administrator",
          "device.monitoring.view",
        ),
      true,
    );
    assert.equal(
      await administratorMonitoringAccessService
        .hasPermission(
          "admin-enabled",
          "Administrator",
          "device.command.execute",
        ),
      false,
    );
    assert.equal(
      await administratorMonitoringAccessService
        .hasPermission(
          "admin-revoked",
          "Administrator",
          "device.monitoring.view",
        ),
      false,
    );

    policies.set(
      "admin-enabled",
      {
        enabled: false,
        permissionKeys: [
          "device.monitoring.view",
        ],
      },
    );

    assert.equal(
      await administratorMonitoringAccessService
        .hasPermission(
          "admin-enabled",
          "Administrator",
          "device.monitoring.view",
        ),
      false,
    );
  } finally {
    AdministratorMonitoringAccessModel.findOne =
      originalFindOne;
  }
});

test("only Owner can manage Administrator access and revocation immediately returns 403 on device APIs", async () => {
  const {
    createApp,
  } =
    await import(
      "../../backend/src/app.ts"
    );
  const {
    createTokenPair,
  } =
    await import(
      "../../backend/src/utils/jwt.ts"
    );
  const {
    userRepository,
  } =
    await import(
      "../../backend/src/repositories/user.repository.ts"
    );
  const {
    administratorMonitoringAccessService,
  } =
    await import(
      "../../backend/src/services/administrator-monitoring-access.service.ts"
    );
  const {
    deviceCommandRepository,
  } =
    await import(
      "../../backend/src/repositories/device-command.repository.ts"
    );
  const {
    managedDeviceRepository,
  } =
    await import(
      "../../backend/src/repositories/managed-device.repository.ts"
    );
  const {
    AppError,
  } =
    await import(
      "../../backend/src/utils/app-error.ts"
    );

  const original = {
    findUser:
      userRepository.findById,
    list:
      administratorMonitoringAccessService.listAdministrators,
    update:
      administratorMonitoringAccessService.updateAdministrator,
    requirePermission:
      administratorMonitoringAccessService.requirePermission,
    commandHistory:
      deviceCommandRepository.findRecentByDeviceId,
    findDevice:
      managedDeviceRepository.findByDeviceId,
  };

  let monitoringAllowed =
    true;

  userRepository.findById =
    (async (
      userId: string,
    ) => ({
      id: userId,
      role:
        userId ===
        "owner-user"
          ? "Owner"
          : "Administrator",
      isActive: true,
      mustChangePassword: false,
    })) as any;

  administratorMonitoringAccessService.listAdministrators =
    (async () => [
      {
        administratorUserId:
          "507f1f77bcf86cd799439011",
        fullName:
          "Test Administrator",
        email:
          "admin@example.test",
        enabled: true,
        permissionKeys: [
          "device.monitoring.view",
        ],
      },
    ]) as any;

  administratorMonitoringAccessService.updateAdministrator =
    (async (
      administratorUserId: string,
      input: {
        enabled: boolean;
        permissionKeys: string[];
      },
    ) => ({
      administratorUserId,
      ...input,
    })) as any;

  administratorMonitoringAccessService.requirePermission =
    (async () => {
      if (!monitoringAllowed) {
        throw new AppError(
          "Owner-enabled Monitoring and Device Management permission is required",
          403,
        );
      }
    }) as any;

  deviceCommandRepository.findRecentByDeviceId =
    (async () => []) as any;
  managedDeviceRepository.findByDeviceId =
    (async (deviceId: string) => ({
      deviceId,
      status: "online",
    })) as any;

  const server =
    createServer(
      createApp(),
    );

  try {
    await new Promise<void>(
      (resolve) =>
        server.listen(
          0,
          "127.0.0.1",
          resolve,
        ),
    );

    const address =
      server.address();
    assert.ok(
      address &&
        typeof address ===
          "object",
    );
    const baseUrl =
      "http://127.0.0.1:" +
      address.port +
      "/api/v1";

    const ownerToken =
      createTokenPair({
        sub: "owner-user",
        role: "Owner",
      }).accessToken;
    const adminToken =
      createTokenPair({
        sub: "admin-user",
        role: "Administrator",
      }).accessToken;

    const ownerList =
      await fetch(
        baseUrl +
          "/administrator-monitoring-access",
        {
          headers: {
            Authorization:
              "Bearer " +
              ownerToken,
          },
        },
      );
    assert.equal(
      ownerList.status,
      200,
    );

    const administratorList =
      await fetch(
        baseUrl +
          "/administrator-monitoring-access",
        {
          headers: {
            Authorization:
              "Bearer " +
              adminToken,
          },
        },
      );
    assert.equal(
      administratorList.status,
      403,
    );

    const administratorUpdate =
      await fetch(
        baseUrl +
          "/administrator-monitoring-access/507f1f77bcf86cd799439011",
        {
          method: "PUT",
          headers: {
            Authorization:
              "Bearer " +
              adminToken,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            enabled: true,
            permissionKeys: [
              "device.monitoring.view",
            ],
          }),
        },
      );
    assert.equal(
      administratorUpdate.status,
      403,
    );

    const ownerUpdate =
      await fetch(
        baseUrl +
          "/administrator-monitoring-access/507f1f77bcf86cd799439011",
        {
          method: "PUT",
          headers: {
            Authorization:
              "Bearer " +
              ownerToken,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            enabled: true,
            permissionKeys: [
              "device.monitoring.view",
            ],
          }),
        },
      );
    assert.equal(
      ownerUpdate.status,
      200,
    );

    const allowedCommands =
      await fetch(
        baseUrl +
          "/devices/DEV-ACCESS/commands",
        {
          headers: {
            Authorization:
              "Bearer " +
              adminToken,
          },
        },
      );
    assert.equal(
      allowedCommands.status,
      200,
    );

    monitoringAllowed =
      false;

    const revokedCommands =
      await fetch(
        baseUrl +
          "/devices/DEV-ACCESS/commands",
        {
          headers: {
            Authorization:
              "Bearer " +
              adminToken,
          },
        },
      );
    assert.equal(
      revokedCommands.status,
      403,
    );
  } finally {
    await new Promise<void>(
      (resolve) =>
        server.close(
          () => resolve(),
        ),
    );
    userRepository.findById =
      original.findUser;
    administratorMonitoringAccessService.listAdministrators =
      original.list;
    administratorMonitoringAccessService.updateAdministrator =
      original.update;
    administratorMonitoringAccessService.requirePermission =
      original.requirePermission;
    deviceCommandRepository.findRecentByDeviceId =
      original.commandHistory;
    managedDeviceRepository.findByDeviceId =
      original.findDevice;
  }
});
