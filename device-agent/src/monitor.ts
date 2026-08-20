import os from "node:os";
import si from "systeminformation";

export type LiveSystemMetrics = {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  uptime: number;
  networkOnline: boolean;
  batteryPercent?: number;
  username: string;
};

export async function getLiveSystemMetrics(): Promise<LiveSystemMetrics> {
  const [cpuLoad, memory, fileSystems, battery, networkInterfaces] =
    await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.battery(),
      si.networkInterfaces(),
    ]);

  const systemDisk =
    fileSystems.find(
      (disk) => disk.mount === "C:" || disk.mount === "C:\\",
    ) ??
    fileSystems.find((disk) => disk.use >= 0) ??
    fileSystems[0];

  const networkOnline = networkInterfaces.some(
    (network) =>
      network.operstate === "up" &&
      network.internal !== true &&
      Boolean(network.ip4),
  );

  const batteryPercent =
    battery.hasBattery && typeof battery.percent === "number"
      ? Number(battery.percent.toFixed(1))
      : undefined;

  const metrics: LiveSystemMetrics = {
    cpuUsage: Number(cpuLoad.currentLoad.toFixed(1)),

    ramUsage:
      memory.total > 0
        ? Number(((memory.used / memory.total) * 100).toFixed(1))
        : 0,

    diskUsage: systemDisk
      ? Number(systemDisk.use.toFixed(1))
      : 0,

    uptime: Math.floor(os.uptime()),

    networkOnline,

    username: os.userInfo().username,
  };

  if (batteryPercent !== undefined) {
    metrics.batteryPercent = batteryPercent;
  }

  return metrics;
}