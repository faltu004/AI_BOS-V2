import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  Download,
  RefreshCw,
  RotateCw,
  Settings2,
  Trash2,
} from "lucide-react";

import {
  Button,
} from "@shared/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/ui/card";

import {
  fetchSoftwareCatalog,
  sendDeviceAppCommand,
  type DeviceAppCommandType,
  type SoftwareCatalogPackage,
} from "./monitoring.api";

type DeviceSoftwareManagementPanelProps = {
  deviceId: string;
  token: string | undefined;
};

function actionLabel(
  type: DeviceAppCommandType,
): string {
  if (
    type === "INSTALL_APP"
  ) {
    return "Install";
  }

  if (
    type === "UNINSTALL_APP"
  ) {
    return "Uninstall";
  }

  return "Update";
}

export function DeviceSoftwareManagementPanel({
  deviceId,
  token,
}: DeviceSoftwareManagementPanelProps) {
  const [
    packages,
    setPackages,
  ] =
    useState<SoftwareCatalogPackage[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    sendingKey,
    setSendingKey,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const loadCatalog =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const result =
            await fetchSoftwareCatalog(
              token,
            );

          setPackages(
            result.packages ?? [],
          );

          setError(null);
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load approved software catalog.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        token,
      ],
    );

  useEffect(
    () => {
      void loadCatalog();

      const timer =
        window.setInterval(
          () => {
            void loadCatalog();
          },
          30_000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      loadCatalog,
    ],
  );

  async function sendAction(
    softwarePackage:
      SoftwareCatalogPackage,
    type:
      DeviceAppCommandType,
  ) {
    const label =
      actionLabel(
        type,
      );

    const confirmed =
      window.confirm(
        label +
          " " +
          softwarePackage.name +
          " " +
          softwarePackage.version +
          " on device " +
          deviceId +
          "?",
      );

    if (!confirmed) {
      return;
    }

    const key =
      type +
      ":" +
      softwarePackage.packageId;

    setSendingKey(
      key,
    );

    setError(null);
    setMessage(null);

    try {
      const command =
        await sendDeviceAppCommand(
          deviceId,
          type,
          softwarePackage.packageId,
          token,
        );

      setMessage(
        label +
          " command queued for " +
          softwarePackage.name +
          ". Command ID: " +
          command.commandId,
      );
    } catch (
      sendError
    ) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to queue software command.",
      );
    } finally {
      setSendingKey(
        null,
      );
    }
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              Software Management
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Install, uninstall, or update approved MSI packages.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" type="button" variant="outline">
              <Link to="/monitoring/software-catalog">
                <Settings2 className="mr-2 h-4 w-4" />
                Manage Catalog
              </Link>
            </Button>

            <Button
              disabled={loading}
              onClick={() =>
                void loadCatalog()
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw
                className={
                  "mr-2 h-4 w-4" +
                  (
                    loading
                      ? " animate-spin"
                      : ""
                  )
                }
              />

              Refresh Catalog
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            {message}
          </div>
        )}

        {loading &&
        packages.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Loading approved software catalog...
          </div>
        ) : packages.length ===
          0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No approved software packages are available yet.
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium">
                    Application
                  </th>

                  <th className="p-3 font-medium">
                    Version
                  </th>

                  <th className="p-3 font-medium">
                    Publisher
                  </th>

                  <th className="p-3 font-medium">
                    Status
                  </th>

                  <th className="p-3 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {packages.map(
                  (
                    softwarePackage,
                  ) => {
                    const installKey =
                      "INSTALL_APP:" +
                      softwarePackage.packageId;

                    const uninstallKey =
                      "UNINSTALL_APP:" +
                      softwarePackage.packageId;

                    const updateKey =
                      "UPDATE_APP:" +
                      softwarePackage.packageId;

                    return (
                      <tr
                        className="border-b last:border-b-0"
                        key={
                          softwarePackage.packageId
                        }
                      >
                        <td className="p-3">
                          <div className="font-medium">
                            {
                              softwarePackage.name
                            }
                          </div>

                          <div className="text-xs text-muted-foreground">
                            MSI · {
                              softwarePackage.packageId
                            }
                          </div>
                        </td>

                        <td className="p-3">
                          {
                            softwarePackage.version
                          }
                        </td>

                        <td className="p-3">
                          {
                            softwarePackage.publisher
                          }
                        </td>

                        <td className="p-3">
                          {
                            softwarePackage.enabled
                              ? "Approved"
                              : "Disabled"
                          }
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              disabled={
                                !softwarePackage.enabled ||
                                sendingKey !== null
                              }
                              onClick={() =>
                                void sendAction(
                                  softwarePackage,
                                  "INSTALL_APP",
                                )
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Download className="mr-2 h-4 w-4" />

                              {sendingKey ===
                              installKey
                                ? "Sending..."
                                : "Install"}
                            </Button>

                            <Button
                              disabled={
                                sendingKey !==
                                null
                              }
                              onClick={() =>
                                void sendAction(
                                  softwarePackage,
                                  "UNINSTALL_APP",
                                )
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />

                              {sendingKey ===
                              uninstallKey
                                ? "Sending..."
                                : "Uninstall"}
                            </Button>

                            <Button
                              disabled={
                                !softwarePackage.enabled ||
                                sendingKey !== null
                              }
                              onClick={() =>
                                void sendAction(
                                  softwarePackage,
                                  "UPDATE_APP",
                                )
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <RotateCw className="mr-2 h-4 w-4" />

                              {sendingKey ===
                              updateKey
                                ? "Sending..."
                                : "Update"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Only approved catalog packages can be executed.
          {" · "}
          Package integrity is verified by SHA256 on the device.
        </div>
      </CardContent>
    </Card>
  );
}
