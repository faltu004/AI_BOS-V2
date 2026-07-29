import { Router } from "express";
import { analyticsRoutes } from "./analytics.routes.js";
import { aiRoutes } from "./ai.routes.js";
import { authRoutes } from "./auth.routes.js";
import { auditLogRoutes } from "./audit-log.routes.js";
import { backupRoutes } from "./backup.routes.js";
import { branchRoutes } from "./branch.routes.js";
import { collaborationMessageRoutes } from "./collaboration-message.routes.js";
import { collaborationRoomRoutes } from "./collaboration-room.routes.js";
import { companyPolicyRoutes } from "./company-policy.routes.js";
import { departmentRoutes } from "./department.routes.js";
import { holidayRoutes } from "./holiday.routes.js";
import { integrationRoutes } from "./integration.routes.js";
import { notificationRoutes } from "./notification.routes.js";
import { notificationPreferenceRoutes } from "./notification-preference.routes.js";
import { scheduledNotificationRoutes } from "./scheduled-notification.routes.js";
import { organizationRoutes } from "./organization.routes.js";
import { organizationSettingsRoutes } from "./organization-settings.routes.js";
import { orgHierarchyRoutes } from "./org-hierarchy.routes.js";
import { permissionAuditLogRoutes } from "./permission-audit-log.routes.js";
import { permissionCatalogRoutes } from "./permission-catalog.routes.js";
import { permissionGroupRoutes } from "./permission-group.routes.js";
import { projectRoutes } from "./project.routes.js";
import { roleRoutes } from "./role.routes.js";
import { roleHistoryRoutes } from "./role-history.routes.js";
import { roleTemplateRoutes } from "./role-template.routes.js";
import { securityRoutes } from "./security.routes.js";
import { teamRoutes } from "./team.routes.js";
import { uploadRoutes } from "./upload.routes.js";
import { userRoutes } from "./user.routes.js";
import { workflowRoutes } from "./workflow.routes.js";
import { auditMiddleware } from "../middleware/audit.middleware.js";
import { monitoringRoutes } from "./monitoring.routes.js";

export const routes = Router();

routes.use(auditMiddleware);

routes.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AI BOS API v1",
  });
});

routes.use("/analytics", analyticsRoutes);
routes.use("/ai", aiRoutes);
routes.use("/audit/logs", auditLogRoutes);
routes.use("/auth", authRoutes);
routes.use("/backup", backupRoutes);
routes.use("/collaboration/rooms", collaborationRoomRoutes);
routes.use("/collaboration/messages", collaborationMessageRoutes);
routes.use("/integrations", integrationRoutes);
routes.use("/notifications/preferences", notificationPreferenceRoutes);
routes.use("/notifications/scheduled", scheduledNotificationRoutes);
routes.use("/notifications", notificationRoutes);
routes.use("/projects", projectRoutes);
routes.use("/users", userRoutes);
routes.use("/uploads", uploadRoutes);
routes.use("/workflows", workflowRoutes);
routes.use("/organization/settings", organizationSettingsRoutes);
routes.use("/organization/departments", departmentRoutes);
routes.use("/organization/branches", branchRoutes);
routes.use("/organization/teams", teamRoutes);
routes.use("/organization/holidays", holidayRoutes);
routes.use("/organization/policies", companyPolicyRoutes);
routes.use("/organization/hierarchy", orgHierarchyRoutes);
routes.use("/organization", organizationRoutes);
routes.use("/rbac/roles", roleRoutes);
routes.use("/rbac/permission-groups", permissionGroupRoutes);
routes.use("/rbac/role-templates", roleTemplateRoutes);
routes.use("/rbac/audit-log", permissionAuditLogRoutes);
routes.use("/rbac/role-history", roleHistoryRoutes);
routes.use("/rbac/permissions", permissionCatalogRoutes);
routes.use("/security", securityRoutes);
routes.use("/monitoring", monitoringRoutes);
