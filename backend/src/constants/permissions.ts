export type PermissionModule =
  | "Organization"
  | "Department"
  | "Branch"
  | "Team"
  | "Holiday"
  | "Approval"
  | "Project"
  | "Workflow"
  | "Document"
  | "Analytics"
  | "Integration"
  | "User Management"
  | "Role Management"
  | "Collaboration"
  | "Notification"
  | "Audit"
  | "Backup";

export type PermissionCatalogEntry = {
  key: string;
  module: PermissionModule;
  label: string;
  description: string;
};

export const permissionCatalog: PermissionCatalogEntry[] = [
  // Organization
  { key: "organization.update", module: "Organization", label: "Update company profile", description: "Edit company name, logo, business type, and tax details." },
  { key: "organization_settings.update", module: "Organization", label: "Update organization settings", description: "Edit business hours, working days, and workspace preferences." },

  // Department
  { key: "department.create", module: "Department", label: "Create department", description: "Create new departments." },
  { key: "department.update", module: "Department", label: "Update department", description: "Edit existing departments." },
  { key: "department.delete", module: "Department", label: "Delete department", description: "Remove departments." },

  // Branch
  { key: "branch.create", module: "Branch", label: "Create branch", description: "Create new branches or office locations." },
  { key: "branch.update", module: "Branch", label: "Update branch", description: "Edit existing branches." },
  { key: "branch.delete", module: "Branch", label: "Delete branch", description: "Remove branches." },

  // Team
  { key: "team.create", module: "Team", label: "Create team", description: "Create new teams." },
  { key: "team.update", module: "Team", label: "Update team", description: "Edit existing teams." },
  { key: "team.delete", module: "Team", label: "Delete team", description: "Remove teams." },

  // Holiday
  { key: "holiday.create", module: "Holiday", label: "Create holiday", description: "Add holiday calendar entries." },
  { key: "holiday.update", module: "Holiday", label: "Update holiday", description: "Edit holiday calendar entries." },
  { key: "holiday.delete", module: "Holiday", label: "Delete holiday", description: "Remove holiday calendar entries." },

  // Approval (policy publish + workflow approval-step actions)
  { key: "policy.create", module: "Approval", label: "Create company policy", description: "Draft new company policies." },
  { key: "policy.update", module: "Approval", label: "Update company policy", description: "Edit company policies." },
  { key: "policy.publish", module: "Approval", label: "Publish company policy", description: "Approve and publish a draft policy." },
  { key: "policy.delete", module: "Approval", label: "Delete company policy", description: "Remove company policies." },
  { key: "policy.view_all", module: "Approval", label: "View all policies", description: "View draft and archived policies, not just published ones." },
  { key: "workflow.approve_step", module: "Approval", label: "Approve workflow step", description: "Approve an approval-type workflow step." },

  // Project
  { key: "project.view_stats", module: "Project", label: "View project stats", description: "View aggregate project statistics." },
  { key: "project.export", module: "Project", label: "Export projects", description: "Export project lists as CSV/PDF." },
  { key: "project.create", module: "Project", label: "Create project", description: "Create new projects." },
  { key: "project.update", module: "Project", label: "Update project", description: "Edit existing projects." },
  { key: "project.delete", module: "Project", label: "Delete project", description: "Remove projects." },
  { key: "project.bulk_update", module: "Project", label: "Bulk update projects", description: "Update multiple projects at once." },
  { key: "project.bulk_delete", module: "Project", label: "Bulk delete projects", description: "Remove multiple projects at once." },
  { key: "project.archive", module: "Project", label: "Archive project", description: "Archive a project." },
  { key: "project.duplicate", module: "Project", label: "Duplicate project", description: "Duplicate an existing project." },

  // Workflow
  { key: "workflow.view_stats", module: "Workflow", label: "View workflow stats", description: "View aggregate workflow statistics." },
  { key: "workflow.create", module: "Workflow", label: "Create workflow", description: "Create new workflows." },
  { key: "workflow.update", module: "Workflow", label: "Update workflow", description: "Edit existing workflows." },
  { key: "workflow.delete", module: "Workflow", label: "Delete workflow", description: "Remove workflows." },
  { key: "workflow.duplicate", module: "Workflow", label: "Duplicate workflow", description: "Duplicate an existing workflow." },
  { key: "workflow.toggle_status", module: "Workflow", label: "Toggle workflow status", description: "Activate or pause a workflow." },
  { key: "workflow.execute", module: "Workflow", label: "Execute workflow", description: "Run a workflow." },

  // Document
  { key: "document.upload", module: "Document", label: "Upload document", description: "Upload files (reserved for future dedicated document management)." },

  // Analytics
  { key: "analytics.view", module: "Analytics", label: "View analytics", description: "View business analytics dashboards." },
  { key: "analytics.export", module: "Analytics", label: "Export analytics", description: "Export analytics reports." },

  // Integration
  { key: "integration.manage", module: "Integration", label: "Manage integrations", description: "Connect, sync, and manage third-party integrations." },

  // User Management
  { key: "user.view_all", module: "User Management", label: "View all users", description: "View the full user directory." },
  { key: "user.create", module: "User Management", label: "Create user profile", description: "Create new user accounts for the roles you're allowed to manage." },
  { key: "user.edit", module: "User Management", label: "Edit employee profile", description: "Edit employee profile details such as department, designation, and salary." },

  // Role Management
  { key: "role.view", module: "Role Management", label: "View roles", description: "View roles and the permission matrix." },
  { key: "role.create", module: "Role Management", label: "Create role", description: "Create new custom roles." },
  { key: "role.update", module: "Role Management", label: "Update role", description: "Edit role permissions." },
  { key: "role.delete", module: "Role Management", label: "Delete role", description: "Remove custom roles." },
  { key: "role_template.manage", module: "Role Management", label: "Manage role templates", description: "Create and edit role templates." },
  { key: "permission_group.manage", module: "Role Management", label: "Manage permission groups", description: "Create and edit permission groups." },
  { key: "permission_audit.view", module: "Role Management", label: "View permission audit log", description: "View the permission audit trail." },
  { key: "role_history.view", module: "Role Management", label: "View role history", description: "View role permission change history." },

  // Collaboration
  { key: "collaboration.moderate", module: "Collaboration", label: "Moderate collaboration", description: "Delete or pin other members' messages, and archive or manage rooms." },

  // Notification
  { key: "notification.broadcast", module: "Notification", label: "Broadcast notifications", description: "Compose and schedule notifications targeted at roles, teams, or the whole organization." },

  // Audit
  { key: "audit.view", module: "Audit", label: "View audit logs", description: "Search, filter, and export the system-wide audit trail." },

  // Backup
  { key: "backup.manage", module: "Backup", label: "Manage backups", description: "Run, schedule, download, and restore system backups." },
];

export const permissionKeys = permissionCatalog.map((entry) => entry.key) as [string, ...string[]];

export type PermissionKey = (typeof permissionKeys)[number];
