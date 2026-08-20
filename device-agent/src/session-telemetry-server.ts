import http from "node:http";
import axios from "axios";

import {
  config,
} from "./config.js";
import {
  getDeviceAuthHeaders,
} from "./device-auth.js";
import {
  getLocalAgentBaseUrl,
  getLocalAgentHost,
  getLocalAgentPort,
} from "./local-agent-endpoint.js";
import {
  normalizeSessionTelemetry,
  updateLatestSessionTelemetry,
} from "./session-telemetry.js";

const host =
  getLocalAgentHost();

const port =
  getLocalAgentPort();

const maxBodyBytes =
  4 * 1024 * 1024;

type StartSessionTelemetryServerOptions = {
  deviceId: string;

  remoteSupportBackend?: RemoteSupportBackend;
};

type RemoteSupportBackendResponse = {
  status: number;
  data: unknown;
};

export type RemoteSupportBackend = {
  getPending: (
    deviceId: string,
  ) => Promise<RemoteSupportBackendResponse>;

  submitConsent: (
    deviceId: string,
    sessionId: string,
    decision: unknown,
  ) => Promise<RemoteSupportBackendResponse>;

  endSession: (
    deviceId: string,
    sessionId: string,
    reason: unknown,
  ) => Promise<RemoteSupportBackendResponse>;
};

/*
 * The Limited Session Helper calls this local proxy with its own
 * 10_000ms axios timeout (remote-support-local-client.ts). The proxy's
 * own upstream call must resolve well inside that budget so the proxy
 * can always finish the localhost response itself, instead of racing
 * the caller's timeout and leaving the caller with a generic timeout
 * and zero diagnostic information about what happened upstream.
 */
const REMOTE_SUPPORT_PROXY_UPSTREAM_TIMEOUT_MS =
  6_000;

let lastPendingLogAt = 0;
let lastConsentLogAt = 0;
let lastEndLogAt = 0;

const PROXY_LOG_INTERVAL_MS =
  30_000;

function shouldLog(
  lastLogAt: number,
): boolean {
  return (
    lastLogAt === 0 ||
    Date.now() - lastLogAt >=
      PROXY_LOG_INTERVAL_MS
  );
}

function createRemoteSupportBackend():
  RemoteSupportBackend {
  return {
    getPending:
      async (
        deviceId,
      ) => {
        const startedAt =
          Date.now();

        if (
          shouldLog(
            lastPendingLogAt,
          )
        ) {
          console.log(
            "[Remote Proxy] pending request received",
          );

          lastPendingLogAt =
            Date.now();
        }

        try {
          const backendResponse =
            await axios.get(
              config.backendUrl +
                "/api/v1/devices/remote-sessions/pending",
              {
                headers:
                  await getDeviceAuthHeaders(
                    deviceId,
                  ),

                params: {
                  deviceId,
                },

                timeout:
                  REMOTE_SUPPORT_PROXY_UPSTREAM_TIMEOUT_MS,
              },
            );

          if (
            shouldLog(
              lastPendingLogAt,
            )
          ) {
            console.log(
              "[Remote Proxy] pending response status=" +
                backendResponse.status +
                " duration=" +
                (Date.now() - startedAt) +
                "ms",
            );
          }

          return {
            status:
              backendResponse.status,

            data:
              backendResponse.data,
          };
        } catch (error) {
          console.error(
            "[Remote Proxy] pending response status=error duration=" +
              (Date.now() - startedAt) +
              "ms | " +
              upstreamErrorReason(error),
          );

          return upstreamErrorResponse(
            error,
          );
        }
      },

    submitConsent:
      async (
        deviceId,
        sessionId,
        decision,
      ) => {
        const startedAt =
          Date.now();

        if (
          shouldLog(
            lastConsentLogAt,
          )
        ) {
          console.log(
            "[Remote Proxy] consent request received",
          );

          lastConsentLogAt =
            Date.now();
        }

        try {
          const backendResponse =
            await axios.post(
              config.backendUrl +
                "/api/v1/devices/remote-sessions/" +
                encodeURIComponent(
                  sessionId,
                ) +
                "/consent",
              {
                deviceId,
                decision,
              },
              {
                headers: {
                  "Content-Type":
                    "application/json",

                  ...(await getDeviceAuthHeaders(
                    deviceId,
                  )),
                },

                timeout:
                  REMOTE_SUPPORT_PROXY_UPSTREAM_TIMEOUT_MS,
              },
            );

          if (
            shouldLog(
              lastConsentLogAt,
            )
          ) {
            console.log(
              "[Remote Proxy] consent response status=" +
                backendResponse.status +
                " duration=" +
                (Date.now() - startedAt) +
                "ms",
            );
          }

          return {
            status:
              backendResponse.status,

            data:
              backendResponse.data,
          };
        } catch (error) {
          console.error(
            "[Remote Proxy] consent response status=error duration=" +
              (Date.now() - startedAt) +
              "ms | " +
              upstreamErrorReason(error),
          );

          return upstreamErrorResponse(
            error,
          );
        }
      },

    endSession:
      async (
        deviceId,
        sessionId,
        reason,
      ) => {
        const startedAt =
          Date.now();

        if (
          shouldLog(
            lastEndLogAt,
          )
        ) {
          console.log(
            "[Remote Proxy] endpoint credential request received",
          );

          lastEndLogAt =
            Date.now();
        }

        try {
          const backendResponse =
            await axios.post(
              config.backendUrl +
                "/api/v1/devices/remote-sessions/" +
                encodeURIComponent(
                  sessionId,
                ) +
                "/end",
              {
                deviceId,
                reason,
              },
              {
                headers: {
                  "Content-Type":
                    "application/json",

                  ...(await getDeviceAuthHeaders(
                    deviceId,
                  )),
                },

                timeout:
                  REMOTE_SUPPORT_PROXY_UPSTREAM_TIMEOUT_MS,
              },
            );

          if (
            shouldLog(
              lastEndLogAt,
            )
          ) {
            console.log(
              "[Remote Proxy] endpoint credential response status=" +
                backendResponse.status +
                " duration=" +
                (Date.now() - startedAt) +
                "ms",
            );
          }

          return {
            status:
              backendResponse.status,

            data:
              backendResponse.data,
          };
        } catch (error) {
          console.error(
            "[Remote Proxy] endpoint credential response status=error duration=" +
              (Date.now() - startedAt) +
              "ms | " +
              upstreamErrorReason(error),
          );

          return upstreamErrorResponse(
            error,
          );
        }
      },
  };
}

/*
 * Safe, non-sensitive reason string for logs. Never includes headers,
 * tokens, or response bodies.
 */
function upstreamErrorReason(
  error: unknown,
): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "upstream timeout";
    }

    if (error.response) {
      return "upstream status " + error.response.status;
    }

    return "upstream unreachable";
  }

  return "unknown upstream error";
}

/*
 * Always produces a terminal, well-formed proxy response instead of
 * letting the localhost handler hang until the caller's own timeout
 * fires with no diagnostic information.
 */
function upstreamErrorResponse(
  error: unknown,
): RemoteSupportBackendResponse {
  if (
    axios.isAxiosError(error) &&
    error.response
  ) {
    return {
      status:
        error.response.status,

      data:
        error.response.data,
    };
  }

  const timedOut =
    axios.isAxiosError(error) &&
    error.code === "ECONNABORTED";

  return {
    status: 504,

    data: {
      success: false,

      message: timedOut
        ? "Remote support backend request timed out"
        : "Remote support backend is unreachable",
    },
  };
}

function readBody(
  request: http.IncomingMessage,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      let body = "";

      request.setEncoding(
        "utf8",
      );

      request.on(
        "data",
        (chunk: string) => {
          body += chunk;

          if (
            Buffer.byteLength(
              body,
              "utf8",
            ) > maxBodyBytes
          ) {
            reject(
              new Error(
                "Session telemetry payload is too large",
              ),
            );
            request.destroy();
          }
        },
      );

      request.on(
        "end",
        () => resolve(body),
      );

      request.on(
        "error",
        reject,
      );
    },
  );
}

function respond(
  response: http.ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(
    statusCode,
    {
      "content-type":
        "application/json; charset=utf-8",
      "cache-control":
        "no-store",
    },
  );

  response.end(
    JSON.stringify(body),
  );
}

export function getSessionTelemetryEndpoint():
  string {
  return `http://${host}:${port}/session-telemetry`;
}

/*
 * Handler-level safety net: guarantees the localhost response always
 * completes well inside the Session Helper's own 10_000ms axios
 * timeout, regardless of what the injected RemoteSupportBackend does
 * internally. Without this, a hang in any backend implementation
 * (including a future one that does not use axios) would hold the
 * localhost request open until the caller's own timeout fires, with
 * no diagnosable response.
 */
const REMOTE_SUPPORT_HANDLER_DEADLINE_MS =
  7_000;

async function withHandlerDeadline<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return Promise.race([
    operation(),

    new Promise<T>(
      (_resolve, reject) => {
        setTimeout(
          () => {
            reject(
              Object.assign(
                new Error(
                  "Remote support proxy handler deadline exceeded",
                ),
                {
                  code: "ECONNABORTED",
                },
              ),
            );
          },
          REMOTE_SUPPORT_HANDLER_DEADLINE_MS,
        );
      },
    ),
  ]);
}

function handlerDeadlineErrorResponse(
  error: unknown,
): RemoteSupportBackendResponse {
  if (
    axios.isAxiosError(error) &&
    error.response
  ) {
    return {
      status:
        error.response.status,

      data:
        error.response.data,
    };
  }

  return {
    status: 504,

    data: {
      success: false,

      message:
        "Remote support backend request timed out",
    },
  };
}

async function proxyRemoteSupportRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  deviceId: string,
  backend: RemoteSupportBackend,
): Promise<boolean> {
  const url =
    new URL(
      request.url ?? "/",
      getLocalAgentBaseUrl(),
    );

  if (
    request.method === "GET" &&
    url.pathname === "/remote-support/pending"
  ) {
    let backendResponse:
      RemoteSupportBackendResponse;

    try {
      backendResponse =
        await withHandlerDeadline(
          () =>
            backend.getPending(
              deviceId,
            ),
        );
    } catch (error) {
      backendResponse =
        handlerDeadlineErrorResponse(
          error,
        );
    }

    respond(
      response,
      backendResponse.status,
      backendResponse.data,
    );

    return true;
  }

  const consentMatch =
    url.pathname.match(
      /^\/remote-support\/([^/]+)\/consent$/,
    );

  if (
    request.method === "POST" &&
    consentMatch
  ) {
    const body =
      JSON.parse(
        await readBody(
          request,
        ),
      ) as {
        decision?: unknown;
      };

    let backendResponse:
      RemoteSupportBackendResponse;

    try {
      backendResponse =
        await withHandlerDeadline(
          () =>
            backend.submitConsent(
              deviceId,
              decodeURIComponent(
                consentMatch[1] ?? "",
              ),
              body.decision,
            ),
        );
    } catch (error) {
      backendResponse =
        handlerDeadlineErrorResponse(
          error,
        );
    }

    respond(
      response,
      backendResponse.status,
      backendResponse.data,
    );

    return true;
  }

  const endMatch =
    url.pathname.match(
      /^\/remote-support\/([^/]+)\/end$/,
    );

  if (
    request.method === "POST" &&
    endMatch
  ) {
    const body =
      JSON.parse(
        await readBody(
          request,
        ),
      ) as {
        reason?: unknown;
      };

    let backendResponse:
      RemoteSupportBackendResponse;

    try {
      backendResponse =
        await withHandlerDeadline(
          () =>
            backend.endSession(
              deviceId,
              decodeURIComponent(
                endMatch[1] ?? "",
              ),
              body.reason,
            ),
        );
    } catch (error) {
      backendResponse =
        handlerDeadlineErrorResponse(
          error,
        );
    }

    respond(
      response,
      backendResponse.status,
      backendResponse.data,
    );

    return true;
  }

  return false;
}

async function proxyInteractiveApplicationRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  deviceId: string,
): Promise<boolean> {
  const url = new URL(
    request.url ?? "/",
    getLocalAgentBaseUrl(),
  );

  if (
    request.method === "GET" &&
    url.pathname === "/application-policy"
  ) {
    const backendResponse = await axios.get(
      config.backendUrl + "/api/v1/devices/application-policy",
      {
        headers: await getDeviceAuthHeaders(deviceId),
        params: { deviceId },
        timeout: 10_000,
      },
    );

    respond(response, backendResponse.status, backendResponse.data);
    return true;
  }

  const endpoint =
    request.method === "POST" &&
    (url.pathname === "/applications/snapshot" ||
      url.pathname === "/applications/session" ||
      url.pathname === "/application-policy/status")
      ? url.pathname
      : null;

  if (!endpoint) {
    return false;
  }

  const parsed = JSON.parse(await readBody(request)) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    respond(response, 400, {
      success: false,
      message: "Invalid interactive application payload",
    });
    return true;
  }

  const backendPath =
    endpoint === "/applications/snapshot"
      ? "/api/v1/devices/applications/snapshot"
      : endpoint === "/applications/session"
        ? "/api/v1/devices/applications/session"
        : "/api/v1/devices/application-policy/status";

  const backendResponse = await axios.post(
    config.backendUrl + backendPath,
    {
      ...(parsed as Record<string, unknown>),
      deviceId,
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...(await getDeviceAuthHeaders(deviceId)),
      },
      timeout: 45_000,
    },
  );

  respond(response, backendResponse.status, backendResponse.data);
  return true;
}

export function startSessionTelemetryServer({
  deviceId,
  remoteSupportBackend = createRemoteSupportBackend(),
}: StartSessionTelemetryServerOptions): () => Promise<void> {
  const server =
    http.createServer(
      async (
        request,
        response,
      ) => {
        try {
          if (
            await proxyInteractiveApplicationRequest(
              request,
              response,
              deviceId,
            )
          ) {
            return;
          }

          if (
            await proxyRemoteSupportRequest(
              request,
              response,
              deviceId,
              remoteSupportBackend,
            )
          ) {
            return;
          }

          if (
            request.method !==
              "POST" ||
            request.url !==
              "/session-telemetry"
          ) {
            respond(response, 404, {
              success: false,
              message:
                "Not found",
            });
            return;
          }

          const headerDeviceId =
            String(
              request.headers[
                "x-aibos-device-id"
              ] ?? "",
            ).trim();

          if (
            headerDeviceId &&
            headerDeviceId !==
            deviceId
          ) {
            respond(response, 403, {
              success: false,
              message:
                "Invalid telemetry source",
            });
            return;
          }

          const parsed =
            JSON.parse(
              await readBody(
                request,
              ),
            );

          const telemetry =
            normalizeSessionTelemetry(
              {
                ...parsed,
                deviceId,
              },
            );

          if (
            !telemetry ||
            telemetry.deviceId !==
              deviceId
          ) {
            respond(response, 400, {
              success: false,
              message:
                "Invalid session telemetry",
            });
            return;
          }

          updateLatestSessionTelemetry(
            telemetry,
          );

          console.log(
            "[Agent] session telemetry received" +
              " | user " +
              telemetry.currentUser +
              " | state " +
              telemetry.sessionState +
              (
                telemetry.currentApplication
                  ? " | app " +
                    telemetry.currentApplication
                      .processName
                  : ""
              ),
          );

          respond(response, 200, {
            success: true,
          });
        } catch (error) {
          respond(response, 400, {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Invalid session telemetry",
          });
        }
      },
    );

  server.listen(
    port,
    host,
    () => {
      console.log(
        "[Agent] session telemetry receiver listening on " +
          host +
          ":" +
          port,
      );
    },
  );

  return () =>
    new Promise<void>(
      (resolve) => {
        server.close(() => {
          resolve();
        });
      },
    );
}
