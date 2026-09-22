const {
  app,
  BrowserWindow,
  shell,
  protocol,
  net,
  ipcMain,
  dialog,
  session
} = require("electron");

const { autoUpdater } = require("electron-updater");

const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");

const {
  APP_ORIGIN,
  registerAppSchemePrivileges,
  readRuntimeConfig,
  registerRendererProtocol,
  isAppUrl,
  isAllowedExternalUrl
} = require("./runtime-security.cjs");

registerAppSchemePrivileges(protocol);

// The Employee renderer keeps its own persistent storage partition. The Admin
// desktop app serves the same custom origin (aibos://app), so sharing the
// default session would let an Admin login overwrite or clear the Employee
// remembered email (ai_bos_remembered_email) stored in localStorage.
const EMPLOYEE_PARTITION = "persist:employee";
let employeeSession = null;
// session.fromPartition() throws before the app is ready, so the Employee
// storage session is created lazily on first use from inside app.whenReady().
function getEmployeeSession() {
  if (!employeeSession) {
    employeeSession = session.fromPartition(EMPLOYEE_PARTITION);
  }
  return employeeSession;
}

let mainWindow;
let runtimeConfig = Object.freeze({});
let enrollmentInFlight = null;
let enrollmentConfirmed = false;

const AGENT_ENROLLMENT_BASE_URL =
  "http://127.0.0.1:57945/v1/enrollment";
const AGENT_HANDOFF_PUBLIC_KEY_PATH = path.join(
  process.env.ProgramData || process.env.PROGRAMDATA || "C:\\ProgramData",
  "AI BOS",
  "DeviceHandoff",
  "agent-public.pem",
);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

function isTrustedIpcSender(event) {
  const senderUrl =
    event.senderFrame?.url ??
    event.sender?.getURL?.() ??
    "";

  return app.isPackaged && isAppUrl(senderUrl);
}

async function readJsonResponse(response, safeContext) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${safeContext} returned an invalid response`);
  }

  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : `${safeContext} failed`,
    );
  }

  return body;
}

async function readEnrollmentHandoffResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Device Agent handoff returned an invalid response");
  }

  const state = body?.data?.state;
  if (
    response.status === 409 &&
    ["enrolled", "bootstrap_pending"].includes(state)
  ) {
    return body;
  }

  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : "Device Agent handoff failed",
    );
  }

  return body;
}

async function syncAuthenticatedDeviceUser(
  accessToken,
  deviceBinding,
  active,
) {
  const apiBaseUrl =
    typeof runtimeConfig.API_BASE_URL === "string"
      ? runtimeConfig.API_BASE_URL.replace(/\/+$/, "")
      : "";

  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error("Employee API configuration is unavailable");
  }

  const response = await net.fetch(
    `${apiBaseUrl}/devices/authenticated-user`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceBinding,
        active,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );

  await readJsonResponse(
    response,
    "Device user session service",
  );
}

async function ensureDeviceEnrollment(
  accessToken,
  active = true,
) {
  const statusResponse = await net.fetch(
    `${AGENT_ENROLLMENT_BASE_URL}/status`,
    {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const statusBody = await readJsonResponse(statusResponse, "Device Agent");
  const status = statusBody?.data;

  const deviceBinding =
    typeof status?.deviceBinding === "string"
      ? status.deviceBinding
      : "";
  const handoffNonce =
    typeof status?.handoffNonce === "string"
      ? status.handoffNonce
      : "";
  const handoffNonceExpiresAt =
    typeof status?.handoffNonceExpiresAt === "string"
      ? status.handoffNonceExpiresAt
      : "";
  const agentProof =
    typeof status?.agentProof === "string"
      ? status.agentProof
      : "";
  const deviceId =
    typeof status?.deviceId === "string"
      ? status.deviceId.trim()
      : "";

  const expiresAtMilliseconds = Date.parse(handoffNonceExpiresAt);
  if (
    !["enrolled", "bootstrap_pending", "awaiting_bootstrap", "recovery_required"].includes(status?.state) ||
    !/^[a-f0-9]{64}$/.test(deviceBinding) ||
    handoffNonce.length < 32 ||
    !Number.isFinite(expiresAtMilliseconds) ||
    expiresAtMilliseconds <= Date.now() ||
    expiresAtMilliseconds > Date.now() + 2 * 60_000 ||
    !agentProof
  ) {
    throw new Error("Device Agent enrollment handoff is unavailable");
  }

  const publicKeyPem = await fs.readFile(AGENT_HANDOFF_PUBLIC_KEY_PATH, "utf8");
  if (publicKeyPem.length > 16_384) {
    throw new Error("Device Agent enrollment identity is invalid");
  }
  const proofPayload = [
    "aibos-agent-handoff-v1",
    status.state,
    deviceBinding,
    handoffNonce,
    handoffNonceExpiresAt,
  ].join("\n");
  const proofIsValid = crypto.verify(
    "RSA-SHA256",
    Buffer.from(proofPayload, "utf8"),
    publicKeyPem,
    Buffer.from(agentProof, "base64"),
  );
  if (!proofIsValid) {
    throw new Error("Device Agent enrollment identity could not be verified");
  }

  if (!active) {
    await syncAuthenticatedDeviceUser(
      accessToken,
      deviceBinding,
      false,
    );

    return {
      state:
        status.state === "enrolled"
          ? "enrolled"
          : "bootstrap_pending",
    };
  }

  if (status.state === "enrolled") {
    await syncAuthenticatedDeviceUser(
      accessToken,
      deviceBinding,
      true,
    );
    enrollmentConfirmed = true;
    return { state: "enrolled" };
  }

  if (status.state === "bootstrap_pending") {
    return { state: "bootstrap_pending" };
  }

  const apiBaseUrl =
    typeof runtimeConfig.API_BASE_URL === "string"
      ? runtimeConfig.API_BASE_URL.replace(/\/+$/, "")
      : "";
  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error("Employee API configuration is unavailable");
  }

  if (status.state === "recovery_required") {
    if (!deviceId) {
      throw new Error("Device Agent recovery identity is unavailable");
    }

    const issueResponse = await net.fetch(
      `${apiBaseUrl}/devices/credential/recovery/self`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceId, deviceBinding }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const issueBody = await readJsonResponse(
      issueResponse,
      "Device recovery service",
    );
    const recoveryAuthorization =
      typeof issueBody?.data?.recoveryAuthorization === "string"
        ? issueBody.data.recoveryAuthorization
        : "";
    if (
      issueBody?.data?.deviceId !== deviceId ||
      !recoveryAuthorization.startsWith("aibos_recover_ot_")
    ) {
      throw new Error("Device recovery service returned an invalid authorization");
    }

    const encryptedRecoveryAuthorization = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(recoveryAuthorization, "utf8"),
    ).toString("base64");

    const recoveryResponse = await net.fetch(
      `${AGENT_ENROLLMENT_BASE_URL}/recovery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedRecoveryAuthorization,
          deviceId,
          deviceBinding,
          handoffNonce,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(35_000),
      },
    );
    const recoveryBody =
      await readEnrollmentHandoffResponse(
        recoveryResponse,
      );
    if (recoveryBody?.data?.state !== "recovered") {
      throw new Error("Device Agent did not confirm credential recovery");
    }

    enrollmentConfirmed = false;
    return { state: "recovery_pending" };
  }

  const issueResponse = await net.fetch(
    `${apiBaseUrl}/devices/enrollment-credentials/self`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceBinding }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const issueBody = await readJsonResponse(issueResponse, "Enrollment service");
  const enrollmentKey =
    typeof issueBody?.data?.enrollmentKey === "string"
      ? issueBody.data.enrollmentKey
      : "";

  if (!enrollmentKey.startsWith("aibos_enroll_ot_")) {
    throw new Error("Enrollment service did not issue a valid bootstrap");
  }

  const encryptedEnrollmentKey = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(enrollmentKey, "utf8"),
  ).toString("base64");

  const handoffResponse = await net.fetch(
    `${AGENT_ENROLLMENT_BASE_URL}/bootstrap`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encryptedEnrollmentKey, deviceBinding, handoffNonce }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const handoffBody = await readEnrollmentHandoffResponse(handoffResponse);
  const handoffState =
    handoffBody?.data?.state === "enrolled"
      ? "enrolled"
      : "bootstrap_pending";
  if (handoffState === "enrolled") {
    enrollmentConfirmed = true;
  }
  return { state: handoffState };
}

function configureMediaPermissions() {
  const trustedOrigin =
    APP_ORIGIN;

  getEmployeeSession().setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const url =
        webContents.getURL();

      callback(
        ["media", "geolocation", "notifications"].includes(permission) &&
          isAppUrl(url) &&
          url.startsWith(trustedOrigin),
      );
    },
  );

  getEmployeeSession().setPermissionCheckHandler(
    (webContents, permission, requestingOrigin) => {
      const url =
        webContents?.getURL?.() ?? "";

      return (
        ["media", "geolocation", "notifications"].includes(permission) &&
        isAppUrl(url) &&
        requestingOrigin === trustedOrigin
      );
    },
  );
}

ipcMain.on(
  "aibos:get-runtime-config",
  (event) => {
    /*
     * Runtime configuration is not a secret, but IPC is still
     * restricted to the trusted packaged AI BOS renderer.
     */
    if (!app.isPackaged) {
      event.returnValue =
        Object.freeze({});
      return;
    }

    const senderUrl =
      event.senderFrame?.url ??
      event.sender?.getURL?.() ??
      "";

    if (!isAppUrl(senderUrl)) {
      event.returnValue =
        Object.freeze({});
      return;
    }

    event.returnValue = runtimeConfig;
  },
);

ipcMain.handle(
  "aibos:ensure-device-enrollment",
  async (
    event,
    receivedAccessToken,
    receivedActive,
  ) => {
    if (!isTrustedIpcSender(event)) {
      throw new Error("Enrollment IPC is unavailable");
    }

    const accessToken =
      typeof receivedAccessToken === "string"
        ? receivedAccessToken.trim()
        : "";
    if (!accessToken || accessToken.length > 16_384) {
      throw new Error("Authentication is required for device enrollment");
    }

    const active =
      receivedActive !== false;

    if (!active) {
      return ensureDeviceEnrollment(
        accessToken,
        false,
      );
    }

    if (!enrollmentInFlight) {
      enrollmentInFlight = ensureDeviceEnrollment(accessToken, true).finally(() => {
        enrollmentInFlight = null;
      });
    }

    return enrollmentInFlight;
  },
);

function protectNavigation(window) {
  window.webContents.setWindowOpenHandler(
    ({ url }) => {
      if (isAllowedExternalUrl(url)) {
        void shell.openExternal(url);
      }

      return {
        action: "deny",
      };
    },
  );

  window.webContents.on(
    "will-navigate",
    (event, url) => {
      if (isAppUrl(url)) {
        return;
      }

      event.preventDefault();

      if (isAllowedExternalUrl(url)) {
        void shell.openExternal(url);
      }
    },
  );

  window.webContents.on(
    "will-attach-webview",
    (event) => {
      event.preventDefault();
    },
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.cjs",
      ),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: EMPLOYEE_PARTITION
    }
  });

  protectNavigation(mainWindow);

  const startUrl = app.isPackaged
    ? `${APP_ORIGIN}/`
    : process.env.AI_BOS_EMPLOYEE_DEV_URL;

  if (!startUrl) {
    throw new Error(
      "AI_BOS_EMPLOYEE_DEV_URL is required for unpackaged Employee desktop development.",
    );
  }

  void mainWindow.loadURL(startUrl);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

function setupAutoUpdates() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    console.error("[AutoUpdate] error:", error?.message ?? error);
  });

  autoUpdater.on("update-available", (info) => {
    console.log("[AutoUpdate] update available:", info?.version);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[AutoUpdate] up to date");
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[AutoUpdate] downloaded:", info?.version);

    void dialog
      .showMessageBox({
        type: "info",
        title: "AI BOS Employee update ready",
        message: `Version ${info?.version ?? ""} has been downloaded.`,
        detail:
          "Restart now to apply the update, or it will be applied automatically the next time the app closes.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.checkForUpdates().catch((error) => {
    console.error("[AutoUpdate] initial check failed:", error?.message ?? error);
  });

  setInterval(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error("[AutoUpdate] periodic check failed:", error?.message ?? error);
    });
  }, UPDATE_CHECK_INTERVAL_MS);
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) {
    return;
  }

  try {
    // The app is ready here, so initialize the Employee storage session
    // before any protocol, permission, or window setup uses it.
    getEmployeeSession();

    if (app.isPackaged) {
      runtimeConfig = readRuntimeConfig({
        resourcesPath:
          process.resourcesPath,
      });

      const rendererRoot = path.join(
        app.getAppPath(),
        "frontend",
        "dist",
      );

      registerRendererProtocol({
        protocol: getEmployeeSession().protocol,
        net,
        rendererRoot,
      });

      setupAutoUpdates();
    }

    configureMediaPermissions();

    createWindow();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    dialog.showErrorBox(
      "AI BOS Employee configuration error",
      message,
    );

    app.quit();
  }

  app.on("activate", () => {
    if (
      BrowserWindow.getAllWindows()
        .length === 0
    ) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
