import { createHash } from "node:crypto";

type NetworkInterfaceInput = {
  mac?: unknown;
  default?: unknown;
  internal?: unknown;
  virtual?: unknown;
};

export type DeviceBindingInventory = {
  hostname?: unknown;
  system?: {
    uuid?: unknown;
    serial?: unknown;
  };
  network?: NetworkInterfaceInput[];
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function primaryMac(network: NetworkInterfaceInput[] | undefined): string {
  if (!Array.isArray(network)) return "";

  const selected =
    network.find(
      (item) =>
        item.default === true &&
        item.internal !== true &&
        item.virtual !== true &&
        Boolean(clean(item.mac)),
    ) ??
    network.find(
      (item) =>
        item.internal !== true &&
        item.virtual !== true &&
        Boolean(clean(item.mac)),
    );

  return clean(selected?.mac).toLowerCase();
}

export function deriveDeviceFingerprint(inventory: DeviceBindingInventory): string {
  const uuid = clean(inventory.system?.uuid);
  if (uuid) return uuid;

  const serial = clean(inventory.system?.serial);
  if (serial) return serial;

  const hostname = clean(inventory.hostname);
  const mac = primaryMac(inventory.network);
  if (hostname && mac) return `${hostname}:${mac}`;
  if (hostname) return hostname;

  throw new Error("Unable to derive a stable device fingerprint");
}

export function deriveDeviceBinding(fingerprint: string): string {
  const normalized = clean(fingerprint);
  if (!normalized) throw new Error("Device fingerprint is required");

  return createHash("sha256")
    .update(`ai-bos-device-binding-v1:${normalized}`, "utf8")
    .digest("hex");
}
