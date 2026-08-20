const {
  contextBridge,
  ipcRenderer
} = require("electron");

const receivedConfig =
  ipcRenderer.sendSync(
    "aibos:get-runtime-config",
  );

const runtimeConfig = Object.freeze(
  receivedConfig &&
  typeof receivedConfig === "object"
    ? {
        ...receivedConfig
      }
    : {},
);

contextBridge.exposeInMainWorld(
  "__AI_BOS_CONFIG__",
  runtimeConfig,
);

contextBridge.exposeInMainWorld(
  "electronAPI",
  Object.freeze({
    platform: process.platform,
    config: runtimeConfig
  }),
);