import {
  z,
} from "zod";

import {
  administratorMonitoringPermissionKeys,
} from "../constants/administrator-monitoring-access.js";

export const administratorMonitoringAccessParamsSchema =
  z.object({
    administratorUserId:
      z.string().min(1).max(100),
  });

export const updateAdministratorMonitoringAccessSchema =
  z.object({
    enabled:
      z.boolean(),
    permissionKeys:
      z.array(
        z.enum(
          administratorMonitoringPermissionKeys,
        ),
      )
        .max(
          administratorMonitoringPermissionKeys.length,
        ),
  });

export type UpdateAdministratorMonitoringAccessInput =
  z.infer<
    typeof updateAdministratorMonitoringAccessSchema
  >;
