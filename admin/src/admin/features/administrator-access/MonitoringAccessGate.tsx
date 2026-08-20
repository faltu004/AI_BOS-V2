import type {
  ReactNode,
} from "react";

import {
  AccessDenied,
} from "@shared/auth/access-control";
import {
  useAdministratorMonitoringAccess,
} from "./AdministratorMonitoringAccessContext";

export function MonitoringAccessGate({
  children,
}: {
  children: ReactNode;
}) {
  const {
    loading,
    hasPermission,
  } =
    useAdministratorMonitoringAccess();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking Monitoring access...
      </div>
    );
  }

  if (
    !hasPermission(
      "device.monitoring.view",
    )
  ) {
    return (
      <AccessDenied message="The Owner has not enabled Monitoring and Device Management access for this Administrator." />
    );
  }

  return <>{children}</>;
}
