import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { loadStoredDeviceCredential } from "./device-credential-store.js";
import {
  loadBootstrapEnrollmentCredential,
  persistBootstrapEnrollmentCredential,
} from "./device-bootstrap-provisioning.js";
import { deriveDeviceBinding, deriveDeviceFingerprint } from "./device-binding.js";
import { getInventory } from "./inventory.js";
import {
  loadEnrollmentHandoffCryptography,
  type EnrollmentHandoffCryptography,
} from "./enrollment-handoff-key.js";

const LOOPBACK_HOST = "127.0.0.1";
const DEFAULT_PORT = 57_945;
const NONCE_TTL_MS = 60_000;
const MAX_NONCES = 8;
const MAX_BODY_BYTES = 16 * 1024;

type BootstrapBody = {
  encryptedEnrollmentKey?: unknown;
  encryptedRecoveryAuthorization?: unknown;
  deviceId?: unknown;
  deviceBinding?: unknown;
  handoffNonce?: unknown;
};

type Challenge = {
  nonce: string;
  expiresAt: number;
};

export type DeviceBootstrapServerOptions = {
  port?: number;
  onBootstrapStored?: () => void;
  getInventory?: typeof getInventory;
  loadStoredDeviceCredential?: typeof loadStoredDeviceCredential;
  loadBootstrapEnrollmentCredential?: typeof loadBootstrapEnrollmentCredential;
  persistBootstrapEnrollmentCredential?: typeof persistBootstrapEnrollmentCredential;
  isCredentialRecoveryRequired?: () => boolean;
  onCredentialRecoveryAuthorized?: (input: {
    deviceId: string;
    deviceBinding: string;
    recoveryAuthorization: string;
  }) => Promise<void>;
  handoffCryptography?: EnrollmentHandoffCryptography;
};

export type DeviceBootstrapServerHandle = {
  port: number;
  stop: () => Promise<void>;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'none'");
  response.end(JSON.stringify(body));
}

function isLoopbackRequest(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress;
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

async function readJson(request: IncomingMessage): Promise<BootstrapBody> {
  const chunks: Buffer[] = [];
  let length = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > MAX_BODY_BYTES) {
      throw new Error("Request body is too large");
    }
    chunks.push(buffer);
  }

  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Request body is invalid");
  }
  return parsed as BootstrapBody;
}

export async function startDeviceBootstrapServer(
  options: DeviceBootstrapServerOptions = {},
): Promise<DeviceBootstrapServerHandle> {
  const readInventory = options.getInventory ?? getInventory;
  const loadCredential = options.loadStoredDeviceCredential ?? loadStoredDeviceCredential;
  const loadBootstrap = options.loadBootstrapEnrollmentCredential ?? loadBootstrapEnrollmentCredential;
  const persistBootstrap = options.persistBootstrapEnrollmentCredential ?? persistBootstrapEnrollmentCredential;
  const handoffCryptography = options.handoffCryptography ?? (await loadEnrollmentHandoffCryptography());
  const inventory = await readInventory();
  const fingerprint = deriveDeviceFingerprint(inventory);
  const deviceBinding = deriveDeviceBinding(fingerprint);
  const challenges = new Map<string, number>();
  let bootstrapWriteInProgress: Promise<void> | null = null;

  function pruneChallenges(now = Date.now()): void {
    for (const [nonce, expiresAt] of challenges) {
      if (expiresAt <= now) challenges.delete(nonce);
    }
    while (challenges.size >= MAX_NONCES) {
      const oldest = challenges.keys().next().value as string | undefined;
      if (!oldest) break;
      challenges.delete(oldest);
    }
  }

  function issueChallenge(): Challenge {
    pruneChallenges();
    const nonce = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + NONCE_TTL_MS;
    challenges.set(nonce, expiresAt);
    return { nonce, expiresAt };
  }

  function consumeChallenge(value: unknown): boolean {
    const nonce = clean(value);
    const expiresAt = challenges.get(nonce);
    challenges.delete(nonce);
    return typeof expiresAt === "number" && expiresAt > Date.now();
  }

  const server = createServer((request, response) => {
    void (async () => {
      if (!isLoopbackRequest(request)) {
        sendJson(response, 403, { success: false, message: "Loopback access required" });
        return;
      }

      // Electron main does not send an Origin header. Rejecting one blocks a web
      // page from using this local endpoint as a cross-origin enrollment bridge.
      if (request.headers.origin) {
        sendJson(response, 403, { success: false, message: "Browser origins are not allowed" });
        return;
      }

      const url = new URL(request.url ?? "/", `http://${LOOPBACK_HOST}`);

      if (request.method === "GET" && url.pathname === "/v1/enrollment/status") {
        const [credential, bootstrap] = await Promise.all([
          loadCredential(),
          loadBootstrap(),
        ]);
        const challenge = issueChallenge();
        const recoveryRequired =
          Boolean(credential) &&
          options.isCredentialRecoveryRequired?.() === true;
        const state = recoveryRequired
          ? "recovery_required"
          : credential
            ? "enrolled"
          : bootstrap || bootstrapWriteInProgress
            ? "bootstrap_pending"
            : "awaiting_bootstrap";
        const expiresAt = new Date(challenge.expiresAt).toISOString();
        const proofPayload = [
          "aibos-agent-handoff-v1",
          state,
          deviceBinding,
          challenge.nonce,
          expiresAt,
        ].join("\n");
        sendJson(response, 200, {
          success: true,
          data: {
            state,
            ...(recoveryRequired
              ? {
                  deviceId:
                    credential?.deviceId,
                }
              : {}),
            deviceBinding,
            handoffNonce: challenge.nonce,
            handoffNonceExpiresAt: expiresAt,
            agentProof: handoffCryptography.signPayload(proofPayload),
          },
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/enrollment/recovery") {
        const body = await readJson(request);
        if (!consumeChallenge(body.handoffNonce)) {
          sendJson(response, 403, { success: false, message: "Enrollment handoff expired" });
          return;
        }

        const submittedBinding = clean(body.deviceBinding).toLowerCase();
        if (submittedBinding !== deviceBinding) {
          sendJson(response, 403, { success: false, message: "Device binding mismatch" });
          return;
        }

        const credential = await loadCredential();
        const submittedDeviceId = clean(body.deviceId);
        if (
          !credential ||
          options.isCredentialRecoveryRequired?.() !== true ||
          submittedDeviceId !== credential.deviceId ||
          !options.onCredentialRecoveryAuthorized
        ) {
          sendJson(response, 409, {
            success: false,
            message: "Device credential recovery is not required",
            data: { state: credential ? "enrolled" : "awaiting_bootstrap" },
          });
          return;
        }

        const encryptedRecoveryAuthorization =
          clean(body.encryptedRecoveryAuthorization);
        if (
          !encryptedRecoveryAuthorization ||
          encryptedRecoveryAuthorization.length > 2048
        ) {
          throw new Error("Encrypted device recovery authorization is invalid");
        }

        const recoveryAuthorization =
          handoffCryptography.decryptEnrollmentKey(
            encryptedRecoveryAuthorization,
          );

        if (!recoveryAuthorization.startsWith("aibos_recover_ot_")) {
          throw new Error("Device recovery authorization is invalid");
        }

        await options.onCredentialRecoveryAuthorized({
          deviceId:
            credential.deviceId,
          deviceBinding,
          recoveryAuthorization,
        });

        sendJson(response, 200, {
          success: true,
          data: { state: "recovered" },
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/enrollment/bootstrap") {
        const body = await readJson(request);
        if (!consumeChallenge(body.handoffNonce)) {
          sendJson(response, 403, { success: false, message: "Enrollment handoff expired" });
          return;
        }

        const submittedBinding = clean(body.deviceBinding).toLowerCase();
        if (submittedBinding !== deviceBinding) {
          sendJson(response, 403, { success: false, message: "Device binding mismatch" });
          return;
        }

        const [credential, existing] = await Promise.all([
          loadCredential(),
          loadBootstrap(),
        ]);

        /*
         * A normal login/bootstrap event must never replace a locally stored
         * per-device credential. Electron treats this conflict as a terminal
         * enrolled state and does not mint another backend bootstrap.
         */
        if (credential) {
          sendJson(response, 409, {
            success: false,
            message: "Device is already enrolled",
            data: { state: "enrolled" },
          });
          return;
        }

        if (existing || bootstrapWriteInProgress) {
          sendJson(response, 409, {
            success: false,
            message: "Enrollment bootstrap is already pending",
            data: { state: "bootstrap_pending" },
          });
          return;
        }

        const encryptedEnrollmentKey = clean(body.encryptedEnrollmentKey);
        if (!encryptedEnrollmentKey || encryptedEnrollmentKey.length > 2048) {
          throw new Error("Encrypted enrollment bootstrap is invalid");
        }
        const enrollmentKey = handoffCryptography.decryptEnrollmentKey(encryptedEnrollmentKey);
        const pendingWrite = persistBootstrap(enrollmentKey, deviceBinding);
        bootstrapWriteInProgress = pendingWrite;
        try {
          await pendingWrite;
        } finally {
          if (bootstrapWriteInProgress === pendingWrite) {
            bootstrapWriteInProgress = null;
          }
        }

        sendJson(response, 202, { success: true, data: { state: "bootstrap_pending" } });
        options.onBootstrapStored?.();
        return;
      }

      sendJson(response, 404, { success: false, message: "Not found" });
    })().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Enrollment handoff failed";
      sendJson(response, 400, { success: false, message });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? DEFAULT_PORT, LOOPBACK_HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const listeningPort = typeof address === "object" && address ? address.port : options.port ?? DEFAULT_PORT;
  console.log(`[Enrollment Handoff] Listening on ${LOOPBACK_HOST}:${listeningPort}.`);

  return {
    port: listeningPort,
    stop: async () => {
      challenges.clear();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
