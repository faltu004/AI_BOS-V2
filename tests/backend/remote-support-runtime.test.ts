import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";

import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

type SessionRecord = Record<string, any> & {
  sessionId: string;
  deviceId: string;
  requestedBy: string;
  status: string;
  expiresAt: Date;
};

function waitForSocketEvent<T>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 3_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const onEvent = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, onEvent);
  });
}

test("remote support creation, consent, endpoint token socket, screen/input, reconnect, expiry, and end lifecycle", async () => {
  const { managedDeviceRepository } = await import(
    "../../backend/src/repositories/managed-device.repository.ts"
  );
  const { remoteSupportSessionRepository } = await import(
    "../../backend/src/repositories/remote-support-session.repository.ts"
  );
  const { remoteSupportSessionService } = await import(
    "../../backend/src/services/remote-support-session.service.ts"
  );
  const { remoteSupportTransportService } = await import(
    "../../backend/src/services/remote-support-transport.service.ts"
  );
  const { createTokenPair } = await import("../../backend/src/utils/jwt.ts");
  const { administratorMonitoringAccessService } = await import(
    "../../backend/src/services/administrator-monitoring-access.service.ts"
  );
  const { initSocketServer, disconnectRemoteSupportSession, validRemoteFrame } = await import(
    "../../backend/src/realtime/socket-server.ts"
  );

  const original = {
    findDevice: managedDeviceRepository.findByDeviceId,
    create: remoteSupportSessionRepository.create,
    findBySession: remoteSupportSessionRepository.findBySessionId,
    findByDeviceSession: remoteSupportSessionRepository.findByDeviceAndSessionId,
    latest: remoteSupportSessionRepository.findLatestByDeviceId,
    pending: remoteSupportSessionRepository.findPendingByDeviceId,
    expire: remoteSupportSessionRepository.expireStaleSessions,
    activate: remoteSupportSessionRepository.activateIfReady,
    update: remoteSupportSessionRepository.updateStatus,
    rotateViewer: remoteSupportSessionRepository.rotateViewerToken,
    requireMonitoringPermission:
      administratorMonitoringAccessService.requirePermission,
  };

  const sessions = new Map<string, SessionRecord>();

  managedDeviceRepository.findByDeviceId = (async (deviceId: string) =>
    deviceId === "DEV-REMOTE-1"
      ? { deviceId, status: "online" }
      : null) as any;
  remoteSupportSessionRepository.create = (async (input: Record<string, unknown>) => {
    const session = {
      ...input,
      status: "pending_consent",
      capabilities: {
        screenView: true,
        remoteControl: true,
        recording: false,
      },
    } as SessionRecord;
    sessions.set(session.sessionId, session);
    return session;
  }) as any;
  remoteSupportSessionRepository.findBySessionId = (async (sessionId: string) =>
    sessions.get(sessionId) ?? null) as any;
  remoteSupportSessionRepository.findByDeviceAndSessionId = (async (
    deviceId: string,
    sessionId: string,
  ) => {
    const session = sessions.get(sessionId);
    return session?.deviceId === deviceId ? session : null;
  }) as any;
  remoteSupportSessionRepository.findLatestByDeviceId = (async (deviceId: string) =>
    [...sessions.values()]
      .filter((session) => session.deviceId === deviceId)
      .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())[0] ?? null) as any;
  remoteSupportSessionRepository.findPendingByDeviceId = (async (deviceId: string) =>
    [...sessions.values()].filter(
      (session) =>
        session.deviceId === deviceId &&
        session.status === "pending_consent" &&
        session.expiresAt.getTime() > Date.now(),
    )) as any;
  remoteSupportSessionRepository.expireStaleSessions = (async (deviceId?: string) => {
    for (const session of sessions.values()) {
      if (
        (!deviceId || session.deviceId === deviceId) &&
        ["pending_consent", "ready"].includes(session.status) &&
        session.expiresAt.getTime() <= Date.now()
      ) {
        session.status = "expired";
        session.endedAt = new Date();
        session.endReason = "Remote support request expired";
      }
    }
  }) as any;
  remoteSupportSessionRepository.activateIfReady = (async (
    sessionId: string,
    expiresAt: Date,
  ) => {
    const session = sessions.get(sessionId);
    if (!session || session.status !== "ready") return null;
    session.status = "active";
    session.startedAt = new Date();
    session.expiresAt = expiresAt;
    return session;
  }) as any;
  remoteSupportSessionRepository.updateStatus = (async (
    sessionId: string,
    status: string,
    update: Record<string, unknown>,
  ) => {
    const session = sessions.get(sessionId);
    if (!session) return null;
    Object.assign(session, update, { status });
    return session;
  }) as any;
  remoteSupportSessionRepository.rotateViewerToken = (async (input: Record<string, string>) => {
    const session = sessions.get(input.sessionId);
    if (
      !session ||
      session.deviceId !== input.deviceId ||
      session.requestedBy !== input.requestedBy ||
      !["ready", "active"].includes(session.status) ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }
    session.viewerTokenHash = input.viewerTokenHash;
    return session;
  }) as any;
  administratorMonitoringAccessService.requirePermission =
    (async () => undefined) as any;

  const httpServer = createServer((_request, response) => response.end("ok"));
  let socketServer: ReturnType<typeof initSocketServer> | undefined;
  const clients: ClientSocket[] = [];

  try {
    const created = await remoteSupportSessionService.createSession({
      deviceId: "DEV-REMOTE-1",
      requestedBy: "admin-user-1",
      requestedByRole: "Administrator",
    });
    const sessionId = created.session.sessionId;

    const pending = await remoteSupportSessionService.getPendingForAgent("DEV-REMOTE-1");
    assert.equal(pending.requests.length, 1);
    assert.equal(pending.requests[0]?.sessionId, sessionId);

    await assert.rejects(
      remoteSupportTransportService.authenticateParticipant({
        sessionId,
        role: "viewer",
        token: created.viewerToken,
      }),
      /transport is not authorized/,
    );

    const approved = await remoteSupportSessionService.respondToConsent({
      deviceId: "DEV-REMOTE-1",
      sessionId,
      decision: "allow",
    });
    assert.equal(approved.session.status, "ready");
    assert.equal(typeof approved.endpointToken, "string");

    const current = await remoteSupportSessionService.getCurrentAdminSession(
      "DEV-REMOTE-1",
    );
    assert.equal(current?.sessionId, sessionId);
    assert.equal(current?.status, "ready");

    const rotated = await remoteSupportSessionService.issueViewerToken({
      deviceId: "DEV-REMOTE-1",
      sessionId,
      requestedBy: "admin-user-1",
    });
    await assert.rejects(
      remoteSupportTransportService.authenticateParticipant({
        sessionId,
        role: "viewer",
        token: created.viewerToken,
      }),
      /Invalid remote support participant token/,
    );
    await assert.rejects(
      remoteSupportSessionService.issueViewerToken({
        deviceId: "DEV-REMOTE-1",
        sessionId,
        requestedBy: "different-admin",
      }),
      /viewer credential is unavailable/,
    );

    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    socketServer = initSocketServer(httpServer);
    const address = httpServer.address();
    assert.ok(address && typeof address === "object");
    const socketUrl = `http://127.0.0.1:${address.port}/remote-support`;

    const wrongTokenEndpoint = createClient(socketUrl, {
      autoConnect: false,
      reconnection: false,
      transports: ["websocket"],
      auth: {
        sessionId,
        role: "endpoint",
        participantToken: "wrong-endpoint-token",
      },
    });
    clients.push(wrongTokenEndpoint);
    const wrongTokenError = waitForSocketEvent<Error>(
      wrongTokenEndpoint,
      "connect_error",
    );
    wrongTokenEndpoint.connect();
    assert.match((await wrongTokenError).message, /Invalid remote support participant token/);

    const wrongSessionEndpoint = createClient(socketUrl, {
      autoConnect: false,
      reconnection: false,
      transports: ["websocket"],
      auth: {
        sessionId: "RMS-WRONG-SESSION",
        role: "endpoint",
        participantToken: approved.endpointToken,
      },
    });
    clients.push(wrongSessionEndpoint);
    const wrongSessionError = waitForSocketEvent<Error>(
      wrongSessionEndpoint,
      "connect_error",
    );
    wrongSessionEndpoint.connect();
    assert.match((await wrongSessionError).message, /not found/);

    const wrongDeviceEndpoint = createClient(socketUrl, {
      autoConnect: false,
      reconnection: false,
      transports: ["websocket"],
      auth: {
        sessionId,
        role: "endpoint",
        participantToken: approved.endpointToken,
        deviceId: "DEV-WRONG",
        deviceToken: "wrong-device-token",
      },
    });
    clients.push(wrongDeviceEndpoint);
    const wrongDeviceError = waitForSocketEvent<Error>(
      wrongDeviceEndpoint,
      "connect_error",
    );
    wrongDeviceEndpoint.connect();
    assert.match((await wrongDeviceError).message, /Invalid device authentication/);

    const endpoint = createClient(socketUrl, {
      autoConnect: false,
      transports: ["websocket"],
      auth: {
        sessionId,
        role: "endpoint",
        participantToken: approved.endpointToken,
      },
    });
    clients.push(endpoint);
    const endpointJoined = waitForSocketEvent(endpoint, "remote:joined");
    endpoint.connect();
    await endpointJoined;

    const accessToken = createTokenPair({
      sub: "admin-user-1",
      role: "Administrator",
    }).accessToken;
    const viewer = createClient(socketUrl, {
      autoConnect: false,
      transports: ["websocket"],
      auth: {
        sessionId,
        role: "viewer",
        participantToken: rotated.viewerToken,
        accessToken,
      },
    });
    clients.push(viewer);
    const viewerJoined = waitForSocketEvent(viewer, "remote:joined");
    const activeStatus = waitForSocketEvent<{ status: string }>(viewer, "remote:status");
    viewer.connect();
    await viewerJoined;
    assert.equal((await activeStatus).status, "active");
    assert.equal(sessions.get(sessionId)?.status, "active");

    const endpointPeer = createClient(socketUrl, {
      autoConnect: false,
      transports: ["websocket"],
      auth: {
        sessionId,
        role: "endpoint",
        participantToken: approved.endpointToken,
      },
    });
    clients.push(endpointPeer);
    const endpointPeerJoined = waitForSocketEvent(endpointPeer, "remote:joined");
    let endpointPeerReceivedFrame = false;
    endpointPeer.on("remote:frame", () => {
      endpointPeerReceivedFrame = true;
    });
    endpointPeer.connect();
    await endpointPeerJoined;

    const frame = {
      mimeType: "image/jpeg",
      data: "dGVzdC1mcmFtZQ==",
      capturedAt: new Date().toISOString(),
    };
    const receivedFrame = waitForSocketEvent<typeof frame>(viewer, "remote:frame");
    endpoint.emit("remote:frame", frame);
    assert.deepEqual(await receivedFrame, frame);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(endpointPeerReceivedFrame, false);

    assert.equal(validRemoteFrame(frame), true);
    assert.equal(
      validRemoteFrame({
        ...frame,
        data: "not base64",
      }),
      false,
    );
    assert.equal(
      validRemoteFrame({
        ...frame,
        data: Buffer.alloc(4 * 1024 * 1024 + 1).toString("base64"),
      }),
      false,
    );

    const invalidFrameError = waitForSocketEvent<{ message: string }>(
      endpoint,
      "remote:error",
    );
    endpoint.emit("remote:frame", {
      ...frame,
      data: "not base64",
    });
    assert.match((await invalidFrameError).message, /Invalid remote screen frame/);

    const input = { type: "key", key: "Enter", action: "down" };
    const receivedInput = waitForSocketEvent<typeof input>(endpoint, "remote:input");
    viewer.emit("remote:input", input);
    assert.deepEqual(await receivedInput, input);

    const endedEvent = waitForSocketEvent<{ reason: string }>(viewer, "remote:ended");
    const ended = await remoteSupportSessionService.endSession({
      deviceId: "DEV-REMOTE-1",
      sessionId,
      reason: "Regression test complete",
    });
    disconnectRemoteSupportSession(sessionId, ended.endReason);
    assert.equal((await endedEvent).reason, "Regression test complete");
    assert.equal(ended.status, "ended");

    const declinedCreated = await remoteSupportSessionService.createSession({
      deviceId: "DEV-REMOTE-1",
      requestedBy: "admin-user-1",
      requestedByRole: "Administrator",
    });
    const declined = await remoteSupportSessionService.respondToConsent({
      deviceId: "DEV-REMOTE-1",
      sessionId: declinedCreated.session.sessionId,
      decision: "decline",
    });
    assert.equal(declined.session.status, "declined");
    assert.equal(declined.endpointToken, null);

    const expiredCreated = await remoteSupportSessionService.createSession({
      deviceId: "DEV-REMOTE-1",
      requestedBy: "admin-user-1",
      requestedByRole: "Administrator",
    });
    const expiredApproved = await remoteSupportSessionService.respondToConsent({
      deviceId: "DEV-REMOTE-1",
      sessionId: expiredCreated.session.sessionId,
      decision: "allow",
    });
    sessions.get(expiredCreated.session.sessionId)!.expiresAt = new Date(Date.now() - 1);
    await assert.rejects(
      remoteSupportTransportService.authenticateParticipant({
        sessionId: expiredCreated.session.sessionId,
        role: "endpoint",
        token: expiredApproved.endpointToken,
      }),
      /expired/,
    );
  } finally {
    for (const client of clients) client.disconnect();
    await socketServer?.close();
    if (httpServer.listening) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    managedDeviceRepository.findByDeviceId = original.findDevice;
    remoteSupportSessionRepository.create = original.create;
    remoteSupportSessionRepository.findBySessionId = original.findBySession;
    remoteSupportSessionRepository.findByDeviceAndSessionId = original.findByDeviceSession;
    remoteSupportSessionRepository.findLatestByDeviceId = original.latest;
    remoteSupportSessionRepository.findPendingByDeviceId = original.pending;
    remoteSupportSessionRepository.expireStaleSessions = original.expire;
    remoteSupportSessionRepository.activateIfReady = original.activate;
    remoteSupportSessionRepository.updateStatus = original.update;
    remoteSupportSessionRepository.rotateViewerToken = original.rotateViewer;
    administratorMonitoringAccessService.requirePermission =
      original.requireMonitoringPermission;
  }
});
