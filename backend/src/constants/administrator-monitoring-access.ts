export const administratorMonitoringPermissionKeys = [
  "device.monitoring.view",
  "device.command.view",
  "device.command.execute",
  "device.command.power",
  "device.software.manage",
  "device.restriction.manage",
  "device.remote_support.create",
  "device.remote_support.control",
] as const;

export type AdministratorMonitoringPermissionKey =
  (typeof administratorMonitoringPermissionKeys)[number];

export const administratorMonitoringPermissionSet =
  new Set<string>(
    administratorMonitoringPermissionKeys,
  );
