import {
  ArrowLeft,
  Clock,
  FileClock,
  Layers,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { useConfirm } from "@shared/ui/confirm-dialog-context";
import { EmptyState } from "@shared/ui/empty-state";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { SkeletonCard } from "@shared/ui/skeleton";
import { useToast } from "@shared/ui/toast-context";
import { cn } from "@shared/lib/utils";
import {
  createPermissionGroup,
  createRole,
  createRoleTemplate,
  deletePermissionGroup,
  deleteRole,
  deleteRoleTemplate,
  fetchAuditLog,
  fetchPermissionCatalog,
  fetchPermissionGroups,
  fetchRoleHistory,
  fetchRoles,
  fetchRoleTemplates,
  updateRole,
} from "./rbac.api";
import {
  emptyPermissionGroupForm,
  emptyRoleForm,
  emptyRoleTemplateForm,
  type PermissionAuditLogEntry,
  type PermissionCatalogEntry,
  type PermissionGroup,
  type PermissionGroupFormInput,
  type Role,
  type RoleFormInput,
  type RoleHistoryEntry,
  type RoleTemplate,
  type RoleTemplateFormInput,
} from "./rbac.schema";

type RbacTab = "matrix" | "roles" | "templates" | "groups" | "audit" | "history";

const tabs: { id: RbacTab; label: string; icon: typeof ShieldCheck }[] = [
  { id: "matrix", label: "Permission Matrix", icon: ShieldCheck },
  { id: "roles", label: "Custom Roles", icon: Layers },
  { id: "templates", label: "Role Templates", icon: Layers },
  { id: "groups", label: "Permission Groups", icon: Layers },
  { id: "audit", label: "Audit Log", icon: FileClock },
  { id: "history", label: "Role History", icon: Clock },
];

function SectionCard({ children, subtitle, title }: { children: ReactNode; subtitle?: string; title: string }) {
  return (
    <Card className="glass rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function groupCatalogByModule(catalog: PermissionCatalogEntry[]) {
  const groups = new Map<string, PermissionCatalogEntry[]>();
  for (const entry of catalog) {
    const list = groups.get(entry.module) ?? [];
    list.push(entry);
    groups.set(entry.module, list);
  }
  return Array.from(groups.entries());
}

export function RBACPage() {
  const session = useMemo(() => getStoredAuthSession(), []);
  const token = session?.accessToken;
  const isAuthorized = session?.user.role === "Administrator" || session?.user.role === "Owner";
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<RbacTab>("matrix");
  const [loading, setLoading] = useState(true);

  const [catalog, setCatalog] = useState<PermissionCatalogEntry[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [auditLog, setAuditLog] = useState<PermissionAuditLogEntry[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [matrixPermissionKeys, setMatrixPermissionKeys] = useState<string[]>([]);
  const [savingMatrix, setSavingMatrix] = useState(false);

  const [roleForm, setRoleForm] = useState<RoleFormInput>(emptyRoleForm);
  const [showRoleForm, setShowRoleForm] = useState(false);

  const [groupForm, setGroupForm] = useState<PermissionGroupFormInput>(emptyPermissionGroupForm);
  const [showGroupForm, setShowGroupForm] = useState(false);

  const [templateForm, setTemplateForm] = useState<RoleTemplateFormInput>(emptyRoleTemplateForm);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const [historyRoleId, setHistoryRoleId] = useState<string>("");
  const [historyEntries, setHistoryEntries] = useState<RoleHistoryEntry[]>([]);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [catalogRes, roleRes, groupRes, templateRes, auditRes] = await Promise.all([
          fetchPermissionCatalog(token),
          fetchRoles(token),
          fetchPermissionGroups(token),
          fetchRoleTemplates(token),
          fetchAuditLog(token),
        ]);
        setCatalog(catalogRes);
        setRoles(roleRes.items);
        setGroups(groupRes.items);
        setTemplates(templateRes.items);
        setAuditLog(auditRes.items);
        if (roleRes.items.length > 0) {
          const firstEditable = roleRes.items.find((role) => !role.hasFullAccess) ?? roleRes.items[0];
          setSelectedRoleId(firstEditable._id);
          setMatrixPermissionKeys(firstEditable.permissionKeys);
        }
      } catch {
        toast({ title: "Failed to load RBAC data", description: "Check that the backend API is reachable.", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isAuthorized, token]);

  const selectedRole = roles.find((role) => role._id === selectedRoleId);
  const catalogByModule = groupCatalogByModule(catalog);

  const selectRoleForMatrix = (role: Role) => {
    setSelectedRoleId(role._id);
    setMatrixPermissionKeys(role.permissionKeys);
  };

  const toggleMatrixPermission = (key: string) => {
    setMatrixPermissionKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const saveMatrix = async () => {
    if (!selectedRole) return;
    setSavingMatrix(true);
    try {
      const updated = await updateRole(selectedRole._id, { permissionKeys: matrixPermissionKeys }, token);
      setRoles((current) => current.map((role) => (role._id === updated._id ? updated : role)));
      toast({ title: "Permissions updated", description: `${selectedRole.name} permissions saved.`, type: "success" });
    } catch (error) {
      toast({ title: "Failed to update permissions", description: (error as Error).message, type: "error" });
    } finally {
      setSavingMatrix(false);
    }
  };

  const submitRole = async () => {
    try {
      const created = await createRole(roleForm, token);
      setRoles((current) => [...current, created]);
      setRoleForm(emptyRoleForm);
      setShowRoleForm(false);
      toast({ title: "Custom role created", type: "success" });
    } catch (error) {
      toast({ title: "Failed to create role", description: (error as Error).message, type: "error" });
    }
  };

  const removeRole = async (role: Role) => {
    const accepted = await confirm({
      title: "Delete role?",
      description: `${role.name} will be permanently removed.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      await deleteRole(role._id, token);
      setRoles((current) => current.filter((item) => item._id !== role._id));
      toast({ title: "Role deleted", type: "success" });
    } catch (error) {
      toast({ title: "Failed to delete role", description: (error as Error).message, type: "error" });
    }
  };

  const submitGroup = async () => {
    try {
      const created = await createPermissionGroup(groupForm, token);
      setGroups((current) => [...current, created]);
      setGroupForm(emptyPermissionGroupForm);
      setShowGroupForm(false);
      toast({ title: "Permission group created", type: "success" });
    } catch (error) {
      toast({ title: "Failed to create permission group", description: (error as Error).message, type: "error" });
    }
  };

  const removeGroup = async (group: PermissionGroup) => {
    const accepted = await confirm({
      title: "Delete permission group?",
      description: `${group.name} will be permanently removed.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      await deletePermissionGroup(group._id, token);
      setGroups((current) => current.filter((item) => item._id !== group._id));
      toast({ title: "Permission group deleted", type: "success" });
    } catch (error) {
      toast({ title: "Failed to delete permission group", description: (error as Error).message, type: "error" });
    }
  };

  const submitTemplate = async () => {
    try {
      const created = await createRoleTemplate(templateForm, token);
      setTemplates((current) => [...current, created]);
      setTemplateForm(emptyRoleTemplateForm);
      setShowTemplateForm(false);
      toast({ title: "Role template created", type: "success" });
    } catch (error) {
      toast({ title: "Failed to create role template", description: (error as Error).message, type: "error" });
    }
  };

  const removeTemplate = async (template: RoleTemplate) => {
    const accepted = await confirm({
      title: "Delete role template?",
      description: `${template.name} will be permanently removed.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      await deleteRoleTemplate(template._id, token);
      setTemplates((current) => current.filter((item) => item._id !== template._id));
      toast({ title: "Role template deleted", type: "success" });
    } catch (error) {
      toast({ title: "Failed to delete role template", description: (error as Error).message, type: "error" });
    }
  };

  const loadHistory = async (roleId: string) => {
    setHistoryRoleId(roleId);
    try {
      const res = await fetchRoleHistory(roleId, token);
      setHistoryEntries(res.items);
    } catch (error) {
      toast({ title: "Failed to load role history", description: (error as Error).message, type: "error" });
    }
  };

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-enterprise p-4">
        <EmptyState
          action={{ label: "Back to Dashboard", onClick: () => window.location.assign("/dashboard") }}
          description="Only Administrator and Owner users can manage roles, permissions, and access governance."
          icon={ShieldAlert}
          title="Admin access required"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" type="button" variant="outline">
              <Link aria-label="Back to Admin" to="/admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <p className="text-sm font-semibold text-primary">Admin / Roles &amp; Permissions</p>
              <h1 className="text-2xl font-bold">Enterprise RBAC</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <Card className="glass">
          <CardContent className="flex gap-2 overflow-x-auto p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  className="shrink-0"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  variant={activeTab === tab.id ? "default" : "outline"}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <>
            {activeTab === "matrix" && (
              <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
                <SectionCard title="Roles">
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <button
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border bg-background/60 p-3 text-left text-sm font-semibold transition-colors hover:border-primary/40",
                          selectedRoleId === role._id && "border-primary/50 bg-primary/5",
                        )}
                        key={role._id}
                        onClick={() => selectRoleForMatrix(role)}
                        type="button"
                      >
                        <span>{role.name}</span>
                        {role.hasFullAccess && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">Full Access</span>}
                      </button>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  subtitle={
                    selectedRole?.hasFullAccess
                      ? "This role has full access to every permission and cannot be edited."
                      : "Toggle permissions granted to this role, grouped by module."
                  }
                  title={selectedRole ? `${selectedRole.name} Permissions` : "Select a role"}
                >
                  {selectedRole && (
                    <div className="space-y-5">
                      {catalogByModule.map(([module, entries]) => (
                        <div key={module}>
                          <p className="mb-2 text-sm font-semibold text-primary">{module}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {entries.map((entry) => (
                              <label
                                className={cn(
                                  "flex items-start gap-3 rounded-lg border bg-background/60 p-3 text-sm",
                                  selectedRole.hasFullAccess ? "opacity-60" : "cursor-pointer hover:border-primary/40",
                                )}
                                key={entry.key}
                              >
                                <input
                                  checked={selectedRole.hasFullAccess || matrixPermissionKeys.includes(entry.key)}
                                  className="mt-0.5 h-4 w-4 accent-primary"
                                  disabled={selectedRole.hasFullAccess}
                                  onChange={() => toggleMatrixPermission(entry.key)}
                                  type="checkbox"
                                />
                                <span>
                                  <span className="block font-semibold">{entry.label}</span>
                                  <span className="mt-1 block text-xs text-muted-foreground">{entry.description}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      {!selectedRole.hasFullAccess && (
                        <Button disabled={savingMatrix} onClick={saveMatrix} type="button">
                          <Save className="h-4 w-4" />
                          {savingMatrix ? "Saving..." : "Save Permissions"}
                        </Button>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {activeTab === "roles" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Custom Roles</h2>
                  <Button onClick={() => setShowRoleForm((v) => !v)} type="button">
                    <Plus className="h-4 w-4" />
                    Add Role
                  </Button>
                </div>
                {showRoleForm && (
                  <SectionCard title="New Custom Role">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="roleName">Name</Label>
                        <Input id="roleName" value={roleForm.name} onChange={(event) => setRoleForm((c) => ({ ...c, name: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roleRank">Rank</Label>
                        <Input id="roleRank" max={100} min={0} type="number" value={roleForm.rank} onChange={(event) => setRoleForm((c) => ({ ...c, rank: Number(event.target.value) }))} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="roleDescription">Description</Label>
                        <Input id="roleDescription" value={roleForm.description} onChange={(event) => setRoleForm((c) => ({ ...c, description: event.target.value }))} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="roleTemplate">Start from Template (optional)</Label>
                        <select
                          className="h-11 w-full rounded-lg border bg-background/75 px-3 text-sm outline-none focus:border-primary"
                          id="roleTemplate"
                          value={roleForm.templateId}
                          onChange={(event) => setRoleForm((c) => ({ ...c, templateId: event.target.value }))}
                        >
                          <option value="">No template</option>
                          {templates.map((template) => (
                            <option key={template._id} value={template._id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button className="mt-4" disabled={!roleForm.name} onClick={submitRole} type="button">
                      Create Role
                    </Button>
                  </SectionCard>
                )}
                {roles.filter((role) => !role.isSystem).length === 0 ? (
                  <EmptyState description="Create custom roles beyond the 10 built-in system roles." icon={Layers} title="No custom roles yet" />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roles
                      .filter((role) => !role.isSystem)
                      .map((role) => (
                        <Card className="glass" key={role._id}>
                          <CardContent className="flex items-start justify-between gap-3 p-4">
                            <div>
                              <p className="font-semibold">{role.name}</p>
                              <p className="text-xs text-muted-foreground">{role.permissionKeys.length} permissions</p>
                            </div>
                            <Button onClick={() => void removeRole(role)} size="icon" type="button" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
                <SectionCard subtitle="Built-in roles (Owner and Administrator always have full access)." title="System Roles">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roles
                      .filter((role) => role.isSystem)
                      .map((role) => (
                        <div className="rounded-lg border bg-background/60 p-3 text-sm" key={role._id}>
                          <span className="font-semibold">{role.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {role.hasFullAccess ? "Full access" : `${role.permissionKeys.length} permissions`}
                          </span>
                        </div>
                      ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {activeTab === "templates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Role Templates</h2>
                  <Button onClick={() => setShowTemplateForm((v) => !v)} type="button">
                    <Plus className="h-4 w-4" />
                    Add Template
                  </Button>
                </div>
                {showTemplateForm && (
                  <SectionCard title="New Role Template">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="templateName">Name</Label>
                        <Input id="templateName" value={templateForm.name} onChange={(event) => setTemplateForm((c) => ({ ...c, name: event.target.value }))} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="templateDescription">Description</Label>
                        <Input id="templateDescription" value={templateForm.description} onChange={(event) => setTemplateForm((c) => ({ ...c, description: event.target.value }))} />
                      </div>
                    </div>
                    <Button className="mt-4" disabled={!templateForm.name} onClick={submitTemplate} type="button">
                      Create Template
                    </Button>
                  </SectionCard>
                )}
                {templates.length === 0 ? (
                  <EmptyState description="Create reusable starting points for new custom roles." icon={Layers} title="No role templates yet" />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {templates.map((template) => (
                      <Card className="glass" key={template._id}>
                        <CardContent className="flex items-start justify-between gap-3 p-4">
                          <div>
                            <p className="font-semibold">{template.name}</p>
                            <p className="text-xs text-muted-foreground">{template.permissionKeys.length} permissions</p>
                          </div>
                          <Button onClick={() => void removeTemplate(template)} size="icon" type="button" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "groups" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Permission Groups</h2>
                  <Button onClick={() => setShowGroupForm((v) => !v)} type="button">
                    <Plus className="h-4 w-4" />
                    Add Group
                  </Button>
                </div>
                {showGroupForm && (
                  <SectionCard title="New Permission Group">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="groupName">Name</Label>
                        <Input id="groupName" value={groupForm.name} onChange={(event) => setGroupForm((c) => ({ ...c, name: event.target.value }))} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="groupDescription">Description</Label>
                        <Input id="groupDescription" value={groupForm.description} onChange={(event) => setGroupForm((c) => ({ ...c, description: event.target.value }))} />
                      </div>
                    </div>
                    <Button className="mt-4" disabled={!groupForm.name} onClick={submitGroup} type="button">
                      Create Group
                    </Button>
                  </SectionCard>
                )}
                {groups.length === 0 ? (
                  <EmptyState description="Bundle related permissions for easier bulk assignment." icon={Layers} title="No permission groups yet" />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {groups.map((group) => (
                      <Card className="glass" key={group._id}>
                        <CardContent className="flex items-start justify-between gap-3 p-4">
                          <div>
                            <p className="font-semibold">{group.name}</p>
                            <p className="text-xs text-muted-foreground">{group.permissionKeys.length} permissions</p>
                          </div>
                          <Button onClick={() => void removeGroup(group)} size="icon" type="button" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "audit" && (
              <SectionCard subtitle="Immutable log of every role, permission group, and template change." title="Permission Audit Log">
                {auditLog.length === 0 ? (
                  <EmptyState description="Audit events appear as roles and permissions are changed." icon={FileClock} title="No audit events yet" />
                ) : (
                  <div className="space-y-2">
                    {auditLog.map((entry) => (
                      <div className="rounded-lg border bg-background/60 p-3 text-sm" key={entry._id}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{entry.action}</span>
                          <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.targetType} - {entry.targetId}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {activeTab === "history" && (
              <SectionCard subtitle="Version history of permission changes for a role." title="Role History">
                <div className="mb-4 space-y-2">
                  <Label htmlFor="historyRole">Role</Label>
                  <select
                    className="h-11 w-full max-w-sm rounded-lg border bg-background/75 px-3 text-sm outline-none focus:border-primary"
                    id="historyRole"
                    value={historyRoleId}
                    onChange={(event) => void loadHistory(event.target.value)}
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                {historyRoleId && historyEntries.length === 0 && (
                  <EmptyState description="No permission changes recorded for this role yet." icon={Clock} title="No history yet" />
                )}
                {historyEntries.length > 0 && (
                  <div className="space-y-2">
                    {historyEntries.map((entry) => (
                      <div className="rounded-lg border bg-background/60 p-3 text-sm" key={entry._id}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">Version {entry.version}</span>
                          <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{entry.permissionKeys.length} permissions in this snapshot</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}
          </>
        )}
      </div>
    </main>
  );
}
