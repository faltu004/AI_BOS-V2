import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("mention authorization follows direct and team room access rules", async () => {
  const { filterAuthorizedMentionIds } = await import(
    "../../backend/src/services/collaboration-room.service.ts"
  );
  const { Types } = await import("../../backend/node_modules/mongoose/index.js");

  const participantId = new Types.ObjectId();
  const outsiderId = new Types.ObjectId();
  const teamMemberId = new Types.ObjectId();
  const teamId = new Types.ObjectId();
  const otherTeamId = new Types.ObjectId();

  const directAllowed = filterAuthorizedMentionIds(
    { roomType: "direct", participantIds: [participantId] } as any,
    [
      { _id: participantId, teamIds: [] },
      { _id: outsiderId, teamIds: [] },
    ] as any,
    [participantId, outsiderId],
  );
  assert.deepEqual(directAllowed.map(String), [participantId.toString()]);

  const teamAllowed = filterAuthorizedMentionIds(
    { roomType: "team", teamId, participantIds: [] } as any,
    [
      { _id: teamMemberId, teamIds: [teamId] },
      { _id: outsiderId, teamIds: [otherTeamId] },
    ] as any,
    [teamMemberId, outsiderId],
  );
  assert.deepEqual(teamAllowed.map(String), [teamMemberId.toString()]);
});

test("unauthorized direct-room mention receives no notification or message preview", async () => {
  const { Types } = await import("../../backend/node_modules/mongoose/index.js");
  const { collaborationMessageService } = await import(
    "../../backend/src/services/collaboration-message.service.ts"
  );
  const { collaborationRoomService } = await import(
    "../../backend/src/services/collaboration-room.service.ts"
  );
  const { userRepository } = await import("../../backend/src/repositories/user.repository.ts");
  const { collaborationMessageRepository } = await import(
    "../../backend/src/repositories/collaboration-message.repository.ts"
  );
  const { collaborationRoomRepository } = await import(
    "../../backend/src/repositories/collaboration-room.repository.ts"
  );
  const { notificationService } = await import("../../backend/src/services/notification.service.ts");

  const senderId = new Types.ObjectId();
  const participantId = new Types.ObjectId();
  const outsiderId = new Types.ObjectId();
  const roomId = new Types.ObjectId();
  const organizationId = new Types.ObjectId();
  const room = {
    _id: roomId,
    organizationId,
    roomType: "direct",
    participantIds: [senderId, participantId],
  } as any;

  const originalRequire = collaborationRoomService.requireRoomAccess;
  const originalFindUsers = userRepository.findActiveByIdsInOrganization;
  const originalCreate = collaborationMessageRepository.create;
  const originalSetLast = collaborationRoomRepository.setLastMessageAt;
  const originalDispatch = notificationService.dispatch;
  const dispatches: any[] = [];
  const createdInputs: any[] = [];

  collaborationRoomService.requireRoomAccess = (async () => room) as any;
  userRepository.findActiveByIdsInOrganization = (async () => [
    { _id: participantId, teamIds: [] },
    { _id: outsiderId, teamIds: [] },
  ]) as any;
  collaborationMessageRepository.create = (async (input: any) => {
    createdInputs.push(input);
    return { ...input, _id: new Types.ObjectId(), createdAt: new Date() };
  }) as any;
  collaborationRoomRepository.setLastMessageAt = (async () => undefined) as any;
  notificationService.dispatch = (async (input: any) => {
    dispatches.push(input);
    return [];
  }) as any;

  try {
    await collaborationMessageService.send(
      senderId.toString(),
      roomId.toString(),
      `Secret preview @Outsider(${outsiderId})`,
    );
    assert.deepEqual(createdInputs[0].mentionedUserIds, []);
    assert.equal(dispatches.length, 0);

    await collaborationMessageService.send(
      senderId.toString(),
      roomId.toString(),
      `Allowed preview @Participant(${participantId})`,
    );
    assert.deepEqual(createdInputs[1].mentionedUserIds.map(String), [participantId.toString()]);
    assert.deepEqual(dispatches[0].recipientUserIds, [participantId.toString()]);
    assert.match(dispatches[0].body, /Allowed preview/);
  } finally {
    collaborationRoomService.requireRoomAccess = originalRequire;
    userRepository.findActiveByIdsInOrganization = originalFindUsers;
    collaborationMessageRepository.create = originalCreate;
    collaborationRoomRepository.setLastMessageAt = originalSetLast;
    notificationService.dispatch = originalDispatch;
  }
});

test("typing and mention socket paths retain room authorization and single notification emission", async () => {
  const source = await readFile("backend/src/realtime/socket-server.ts", "utf8");
  const typingBlock = source.slice(source.indexOf("const relayTyping"), source.indexOf("initRemoteSupportNamespace"));
  const messageBlock = source.slice(source.indexOf('"message:send"'), source.indexOf('"message:react"'));

  assert.match(typingBlock, /requireRoomAccess\(user\.id, roomId\)/);
  assert.doesNotMatch(messageBlock, /notification:new/);
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
