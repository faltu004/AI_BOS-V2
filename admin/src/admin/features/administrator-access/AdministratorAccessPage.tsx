import {
  ArrowLeft,
  MonitorCog,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  Link,
} from "react-router-dom";

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
  useToast,
} from "@shared/ui/toast-context";
import {
  fetchAdministratorMonitoringAccessList,
  updateAdministratorMonitoringAccess,
  type AdministratorMonitoringAccess,
} from "./administrator-monitoring-access.api";

const accessGroups = [
  {
    label:
      "View Monitoring / Device Details",
    permissionKeys: [
      "device.monitoring.view",
    ],
  },
  {
    label:
      "Device Commands",
    permissionKeys: [
      "device.command.view",
      "device.command.execute",
      "device.command.power",
    ],
  },
  {
    label:
      "Software Management",
    permissionKeys: [
      "device.software.manage",
    ],
  },
  {
    label:
      "Application Restrictions",
    permissionKeys: [
      "device.restriction.manage",
    ],
  },
  {
    label:
      "Remote Support",
    permissionKeys: [
      "device.remote_support.create",
      "device.remote_support.control",
    ],
  },
] as const;

function changedByLabel(
  changedBy:
    AdministratorMonitoringAccess["changedBy"],
): string {
  if (!changedBy) {
    return "Migration default";
  }

  if (
    typeof changedBy ===
    "string"
  ) {
    return changedBy;
  }

  return (
    changedBy.fullName ||
    changedBy.email ||
    changedBy.id
  );
}

export function AdministratorAccessPage() {
  const {
    toast,
  } =
    useToast();

  const [items, setItems] =
    useState<AdministratorMonitoringAccess[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState<string | null>(
      null,
    );

  async function load():
    Promise<void> {
    setLoading(
      true,
    );

    try {
      setItems(
        await fetchAdministratorMonitoringAccessList(),
      );
    } catch (error) {
      toast({
        title:
          "Unable to load Administrator access",
        description:
          error instanceof Error
            ? error.message
            : "Request failed",
        type: "error",
      });
    } finally {
      setLoading(
        false,
      );
    }
  }

  useEffect(
    () => {
      void load();
    },
    [],
  );

  function updateLocal(
    administratorUserId: string,
    update: (
      current: AdministratorMonitoringAccess,
    ) => AdministratorMonitoringAccess,
  ): void {
    setItems(
      (current) =>
        current.map(
          (item) =>
            item.administratorUserId ===
            administratorUserId
              ? update(
                  item,
                )
              : item,
        ),
    );
  }

  function toggleGroup(
    administratorUserId: string,
    permissionKeys:
      readonly string[],
  ): void {
    updateLocal(
      administratorUserId,
      (current) => {
        const enabled =
          permissionKeys.every(
            (key) =>
              current.permissionKeys.includes(
                key,
              ),
          );

        const next =
          new Set(
            current.permissionKeys,
          );

        for (const key of permissionKeys) {
          if (enabled) {
            next.delete(
              key,
            );
          } else {
            next.add(
              key,
            );
          }
        }

        return {
          ...current,
          permissionKeys: [
            ...next,
          ],
        };
      },
    );
  }

  async function save(
    item: AdministratorMonitoringAccess,
  ): Promise<void> {
    if (!item.administratorUserId) {
      return;
    }

    setSavingId(
      item.administratorUserId,
    );

    try {
      const updated =
        await updateAdministratorMonitoringAccess(
          item.administratorUserId,
          {
            enabled:
              item.enabled,
            permissionKeys:
              item.permissionKeys,
          },
        );

      updateLocal(
        item.administratorUserId,
        () => updated,
      );

      toast({
        title:
          "Administrator access updated",
        description:
          item.enabled
            ? "Selected Monitoring permissions are now effective."
            : "All Monitoring and Device Management access is revoked.",
        type: "success",
      });
    } catch (error) {
      toast({
        title:
          "Unable to update access",
        description:
          error instanceof Error
            ? error.message
            : "Request failed",
        type: "error",
      });
    } finally {
      setSavingId(
        null,
      );
    }
  }

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Button
            asChild
            variant="ghost"
          >
            <Link to="/settings">
              <ArrowLeft className="h-4 w-4" />
              Settings
            </Link>
          </Button>

          <Button
            disabled={
              loading
            }
            onClick={() =>
              void load()
            }
            size="icon"
            title="Refresh Administrator access"
            type="button"
            variant="outline"
          >
            <RefreshCw
              className={
                "h-4 w-4 " +
                (loading
                  ? "animate-spin"
                  : "")
              }
            />
          </Button>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <section className="border-b pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <MonitorCog className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">
                Access Control
              </p>
              <h1 className="text-2xl font-bold">
                Administrator Access
              </h1>
            </div>
          </div>
        </section>

        {loading &&
          items.length ===
            0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading Administrator accounts...
            </div>
          )}

        {!loading &&
          items.length ===
            0 && (
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              No Administrator accounts are configured.
            </div>
          )}

        <div className="grid gap-4 xl:grid-cols-2">
          {items.map(
            (item) => {
              const id =
                item.administratorUserId!;

              return (
                <Card
                  className="rounded-lg"
                  key={id}
                >
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <CardTitle>
                          {item.fullName ??
                            "Administrator"}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.email}
                        </p>
                      </div>

                      <button
                        aria-checked={
                          item.enabled
                        }
                        aria-label="Enable Monitoring and Device Management"
                        className={
                          "relative h-6 w-11 rounded-full border transition " +
                          (item.enabled
                            ? "border-primary bg-primary"
                            : "bg-muted")
                        }
                        onClick={() =>
                          updateLocal(
                            id,
                            (current) => ({
                              ...current,
                              enabled:
                                !current.enabled,
                            }),
                          )
                        }
                        role="switch"
                        type="button"
                      >
                        <span
                          className={
                            "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition " +
                            (item.enabled
                              ? "left-5"
                              : "left-1")
                          }
                        />
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Enable Monitoring &amp; Device Management
                    </div>

                    <div className="space-y-3">
                      {accessGroups.map(
                        (group) => {
                          const checked =
                            group.permissionKeys.every(
                              (key) =>
                                item.permissionKeys.includes(
                                  key,
                                ),
                            );

                          return (
                            <label
                              className="flex items-center gap-3 text-sm"
                              key={
                                group.label
                              }
                            >
                              <input
                                checked={
                                  checked
                                }
                                className="h-4 w-4 accent-primary"
                                disabled={
                                  !item.enabled
                                }
                                onChange={() =>
                                  toggleGroup(
                                    id,
                                    group.permissionKeys,
                                  )
                                }
                                type="checkbox"
                              />
                              <span>
                                {group.label}
                              </span>
                            </label>
                          );
                        },
                      )}
                    </div>

                    <div className="border-t pt-4 text-xs text-muted-foreground">
                      Last changed by {changedByLabel(
                        item.changedBy,
                      )}
                      {item.changedAt
                        ? " on " +
                          new Date(
                            item.changedAt,
                          ).toLocaleString()
                        : ""}
                    </div>

                    <Button
                      disabled={
                        savingId ===
                        id
                      }
                      onClick={() =>
                        void save(
                          item,
                        )
                      }
                      type="button"
                    >
                      <Save className="h-4 w-4" />
                      {savingId ===
                      id
                        ? "Saving..."
                        : "Save Access"}
                    </Button>
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>
      </div>
    </main>
  );
}
