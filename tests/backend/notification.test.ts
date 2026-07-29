import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

function fakeObjectId() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

test("notificationPreferenceService.getEffective merges stored overrides over defaults", async () => {
  const { notificationPreferenceService } = await import("../../backend/src/services/notification-preference.service.ts");
  const { notificationPreferenceRepository } = await import(
    "../../backend/src/repositories/notification-preference.repository.ts"
  );

  const originalFindByUser = notificationPreferenceRepository.findByUser;
  notificationPreferenceRepository.findByUser = (async () => ({
    userId: fakeObjectId(),
    preferences: { approval: { inApp: true, email: false, whatsapp: false, push: false } },
  })) as any;

  try {
    const approvalPref = await notificationPreferenceService.getEffective("user-1", "approval");
    assert.deepEqual(approvalPref, { inApp: true, email: false, whatsapp: false, push: false });

    // A category with no stored override falls back to the hardcoded defaults.
    const reminderPref = await notificationPreferenceService.getEffective("user-1", "reminder");
    assert.deepEqual(reminderPref, { inApp: true, email: true, whatsapp: false, push: false });
  } finally {
    notificationPreferenceRepository.findByUser = originalFindByUser;
  }
});

test("scheduledNotificationService.create allows a self-only reminder without notification.broadcast", async () => {
  const { scheduledNotificationService } = await import("../../backend/src/services/scheduled-notification.service.ts");
  const { scheduledNotificationRepository } = await import(
    "../../backend/src/repositories/scheduled-notification.repository.ts"
  );
  const { RoleModel } = await import("../../backend/src/models/role.model.ts");

  const userId = fakeObjectId();
  const originalFindOne = RoleModel.findOne;
  const originalCreate = scheduledNotificationRepository.create;

  RoleModel.findOne = ((_query: unknown) => ({
    lean: async () => ({ hasFullAccess: false, permissionKeys: [], isActive: true }),
  })) as any;
  scheduledNotificationRepository.create = (async (data: unknown) => ({ _id: fakeObjectId(), ...(data as object) })) as any;

  try {
    const scheduled = await scheduledNotificationService.create(
      {
        recipientUserIds: [userId],
        recipientRoles: [],
        title: "Remember to follow up",
        body: "",
        category: "reminder",
        priority: "Medium",
        scheduledFor: new Date(),
      } as any,
      userId,
      "employee",
    );

    assert.ok(scheduled);
  } finally {
    RoleModel.findOne = originalFindOne;
    scheduledNotificationRepository.create = originalCreate;
  }
});

test("scheduledNotificationService.create rejects role-targeted scheduling without notification.broadcast", async () => {
  const { scheduledNotificationService } = await import("../../backend/src/services/scheduled-notification.service.ts");
  const { RoleModel } = await import("../../backend/src/models/role.model.ts");

  const userId = fakeObjectId();
  const originalFindOne = RoleModel.findOne;

  RoleModel.findOne = ((_query: unknown) => ({
    lean: async () => ({ hasFullAccess: false, permissionKeys: [], isActive: true }),
  })) as any;

  try {
    await assert.rejects(
      () =>
        scheduledNotificationService.create(
          {
            recipientUserIds: [],
            recipientRoles: ["HR"],
            title: "Team announcement",
            body: "",
            category: "broadcast",
            priority: "Medium",
            scheduledFor: new Date(),
          } as any,
          userId,
          "employee",
        ),
      /permission/i,
    );
  } finally {
    RoleModel.findOne = originalFindOne;
  }
});

test("scheduledNotificationService.create allows role-targeted scheduling with notification.broadcast", async () => {
  const { scheduledNotificationService } = await import("../../backend/src/services/scheduled-notification.service.ts");
  const { scheduledNotificationRepository } = await import(
    "../../backend/src/repositories/scheduled-notification.repository.ts"
  );
  const { RoleModel } = await import("../../backend/src/models/role.model.ts");

  const userId = fakeObjectId();
  const originalFindOne = RoleModel.findOne;
  const originalCreate = scheduledNotificationRepository.create;

  RoleModel.findOne = ((_query: unknown) => ({
    lean: async () => ({ hasFullAccess: false, permissionKeys: ["notification.broadcast"], isActive: true }),
  })) as any;
  scheduledNotificationRepository.create = (async (data: unknown) => ({ _id: fakeObjectId(), ...(data as object) })) as any;

  try {
    const scheduled = await scheduledNotificationService.create(
      {
        recipientUserIds: [],
        recipientRoles: ["HR"],
        title: "Team announcement",
        body: "",
        category: "broadcast",
        priority: "Medium",
        scheduledFor: new Date(),
      } as any,
      userId,
      "hr",
    );

    assert.ok(scheduled);
  } finally {
    RoleModel.findOne = originalFindOne;
    scheduledNotificationRepository.create = originalCreate;
  }
});

test("scheduledNotificationService.computeNextFireAt advances a weekly recurrence by 7 days", async () => {
  const { scheduledNotificationService } = await import("../../backend/src/services/scheduled-notification.service.ts");

  const current = new Date("2026-08-03T09:00:00.000Z");
  const next = scheduledNotificationService.computeNextFireAt(current, { frequency: "weekly", interval: 1 });

  assert.ok(next);
  assert.equal(next?.toISOString(), "2026-08-10T09:00:00.000Z");
});

test("scheduledNotificationService.computeNextFireAt returns null once the recurrence end date has passed", async () => {
  const { scheduledNotificationService } = await import("../../backend/src/services/scheduled-notification.service.ts");

  const current = new Date("2026-08-03T09:00:00.000Z");
  const next = scheduledNotificationService.computeNextFireAt(current, {
    frequency: "weekly",
    interval: 1,
    endDate: new Date("2026-08-05T00:00:00.000Z"),
  });

  assert.equal(next, null);
});
