import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

function fakeObjectId() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

test("resolveRoomAccess grants team room access only to team members", async () => {
  const { resolveRoomAccess } = await import("../../backend/src/services/collaboration-room.service.ts");

  const teamId = fakeObjectId();
  const otherTeamId = fakeObjectId();
  const room = { roomType: "team", teamId } as any;

  const member = { _id: fakeObjectId(), teamIds: [teamId] } as any;
  const nonMember = { _id: fakeObjectId(), teamIds: [otherTeamId] } as any;
  const noTeams = { _id: fakeObjectId(), teamIds: [] } as any;

  assert.equal(resolveRoomAccess(member, room), true);
  assert.equal(resolveRoomAccess(nonMember, room), false);
  assert.equal(resolveRoomAccess(noTeams, room), false);
});

test("resolveRoomAccess grants direct room access only to participants", async () => {
  const { resolveRoomAccess } = await import("../../backend/src/services/collaboration-room.service.ts");

  const participantId = fakeObjectId();
  const outsiderId = fakeObjectId();
  const room = { roomType: "direct", participantIds: [participantId] } as any;

  assert.equal(resolveRoomAccess({ _id: participantId } as any, room), true);
  assert.equal(resolveRoomAccess({ _id: outsiderId } as any, room), false);
});

test("resolveRoomAccess allows any authenticated user into workspace, project, and entity rooms", async () => {
  const { resolveRoomAccess } = await import("../../backend/src/services/collaboration-room.service.ts");

  const anyUser = { _id: fakeObjectId(), teamIds: [] } as any;
  assert.equal(resolveRoomAccess(anyUser, { roomType: "workspace" } as any), true);
  assert.equal(resolveRoomAccess(anyUser, { roomType: "project" } as any), true);
  assert.equal(resolveRoomAccess(anyUser, { roomType: "entity" } as any), true);
});

test("notificationService.parseMentions extracts and dedupes mentioned user ids", async () => {
  const { notificationService } = await import("../../backend/src/services/notification.service.ts");

  const idA = fakeObjectId();
  const idB = fakeObjectId();
  const body = `Hey @Jordan Lee(${idA}) and @Jordan Lee(${idA}) please loop in @Sam(${idB}). Not a mention: @plain-text`;

  const mentions = notificationService.parseMentions(body).map((id) => id.toString());

  assert.deepEqual(mentions.sort(), [idA, idB].sort());
});

test("notificationService.parseMentions returns an empty array when there are no mention tokens", async () => {
  const { notificationService } = await import("../../backend/src/services/notification.service.ts");

  assert.deepEqual(notificationService.parseMentions("just a normal message, no mentions here"), []);
});

test("collaboration message repository excludes soft-deleted messages from list()", async () => {
  const { collaborationMessageRepository } = await import(
    "../../backend/src/repositories/collaboration-message.repository.ts"
  );
  const { CollaborationMessageModel } = await import("../../backend/src/models/collaboration-message.model.ts");

  const originalFind = CollaborationMessageModel.find;
  const capturedFilters: unknown[] = [];

  CollaborationMessageModel.find = ((filter: unknown) => {
    capturedFilters.push(filter);
    return {
      sort: () => ({ limit: () => ({ lean: async () => [] }) }),
    };
  }) as any;

  try {
    await collaborationMessageRepository.list("room-1", undefined, 50);
    assert.deepEqual(capturedFilters[0], { roomId: "room-1", deletedAt: null });
  } finally {
    CollaborationMessageModel.find = originalFind;
  }
});

test("collaboration room schema enforces required fields", async () => {
  const { CollaborationRoomModel } = await import("../../backend/src/models/collaboration-room.model.ts");

  const room = new CollaborationRoomModel({});
  const error = room.validateSync();

  assert.ok(error?.errors.organizationId);
  assert.ok(error?.errors.roomType);
  assert.ok(error?.errors.name);
});
