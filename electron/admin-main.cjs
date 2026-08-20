const {
  app,
  BrowserWindow,
  shell,
  protocol,
  net,
  ipcMain,
  dialog
} = require("electron");

const path = require("node:path");

const {
  APP_ORIGIN,
  registerAppSchemePrivileges,
  readRuntimeConfig,
  registerRendererProtocol,
  isAppUrl,
  isAllowedExternalUrl
} = require("./runtime-security.cjs");

registerAppSchemePrivileges(protocol);

let mainWindow;
let runtimeConfig = Object.freeze({});

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
    minWidth: 1200,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.cjs",
      ),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  protectNavigation(mainWindow);

  const startUrl = app.isPackaged
    ? `${APP_ORIGIN}/`
    : process.env.AI_BOS_ADMIN_DEV_URL;

  if (!startUrl) {
    throw new Error(
      "AI_BOS_ADMIN_DEV_URL is required for unpackaged Admin desktop development.",
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

app.whenReady().then(() => {
  try {
    if (app.isPackaged) {
      runtimeConfig = readRuntimeConfig({
        resourcesPath:
          process.resourcesPath,
      });

      const rendererRoot = path.join(
        app.getAppPath(),
        "admin",
        "dist",
      );

      registerRendererProtocol({
        protocol,
        net,
        rendererRoot,
      });
    }

    createWindow();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    dialog.showErrorBox(
      "AI BOS Admin configuration error",
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