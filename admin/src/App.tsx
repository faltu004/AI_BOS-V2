import { Navigate } from "react-router-dom";
import { AnimatedAppRoutes, AppProviders, lazyNamed, type AppRouteConfig } from "@shared/platform/AppShell";
import { workspaceSearchItems, quickCreateActions } from "@/data/workspace";

const adminRoles = ["Administrator", "Owner"] as const;
const adminManagerRoles = ["Administrator", "Owner", "Manager"] as const;

const LoginPage = lazyNamed(() => import("@/features/auth/login"), "LoginPage");
const ForgotPasswordPage = lazyNamed(() => import("@/features/auth/pages/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyNamed(() => import("@/features/auth/pages/ResetPasswordPage"), "ResetPasswordPage");
const EmailVerificationPage = lazyNamed(() => import("@/features/auth/pages/EmailVerificationPage"), "EmailVerificationPage");
const AdminDashboardPage = lazyNamed(() => import("@/common/features/dashboard"), "AdminDashboardPage");
const AdminPage = lazyNamed(() => import("@/admin/features/admin"), "AdminPage");
const AdminAccessGate = lazyNamed(() => import("@/admin/features/admin/AdminAccessGate"), "AdminAccessGate");
const CollaborationHubPage = lazyNamed(() => import("@/admin/features/collaboration"), "CollaborationHubPage");
const NotificationCenterPage = lazyNamed(() => import("@/admin/features/notifications"), "NotificationCenterPage");
const OrganizationPage = lazyNamed(() => import("@/admin/features/organization"), "OrganizationPage");
const RBACPage = lazyNamed(() => import("@/admin/features/rbac"), "RBACPage");
const SettingsPage = lazyNamed(() => import("@/admin/features/settings"), "SettingsPage");
const IntegrationsCenterPage = lazyNamed(() => import("@/admin/features/integrations"), "IntegrationsCenterPage");
const AuditBackupPage = lazyNamed(() => import("@/admin/features/audit-backup"), "AuditBackupPage");
const SecurityDashboardPage = lazyNamed(() => import("@/admin/features/security"), "SecurityDashboardPage");
const MonitoringDashboardPage = lazyNamed(() => import("@/admin/features/monitoring"), "MonitoringDashboardPage");
const AnalyticsPage = lazyNamed(() => import("@/common/features/analytics"), "AnalyticsPage");
const ProjectsPage = lazyNamed(() => import("@/manager/features/projects"), "ProjectsPage");
const ProjectDetailsPage = lazyNamed(() => import("@/manager/features/projects"), "ProjectDetailsPage");
const WorkflowsPage = lazyNamed(() => import("@/manager/features/workflows"), "WorkflowsPage");
const TasksPage = lazyNamed(() => import("@/manager/features/tasks"), "TasksPage");
const MeetingsPage = lazyNamed(() => import("@/manager/features/meetings"), "MeetingsPage");
const EmployeesPage = lazyNamed(() => import("@/manager/features/employees"), "EmployeesPage");
const ProfilePage = lazyNamed(() => import("@shared/profile/RoleProfilePage"), "RoleProfilePage");
const TeamAccountsPage = lazyNamed(() => import("@/admin/features/team-accounts"), "TeamAccountsPage");

const routes: AppRouteConfig[] = [
  { path: "/", element: <Navigate replace to="/login" /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/reset-password/:token", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <EmailVerificationPage /> },
  { path: "/verify-email/:token", element: <EmailVerificationPage /> },
  { path: "/dashboard", element: <AdminDashboardPage />, allowedRoles: adminManagerRoles },
  { path: "/profile", element: <ProfilePage />, allowedRoles: adminManagerRoles },
  { path: "/admin", element: <AdminAccessGate><AdminPage /></AdminAccessGate>, allowedRoles: adminRoles },
  { path: "/admin/organization", element: <OrganizationPage />, allowedRoles: adminRoles },
  { path: "/admin/rbac", element: <RBACPage />, allowedRoles: adminRoles },
  { path: "/settings", element: <SettingsPage />, allowedRoles: adminRoles },
  { path: "/integrations", element: <IntegrationsCenterPage />, allowedRoles: adminRoles },
  { path: "/analytics", element: <AnalyticsPage />, allowedRoles: adminManagerRoles },
  { path: "/projects", element: <ProjectsPage />, allowedRoles: adminManagerRoles },
  { path: "/projects/:id", element: <ProjectDetailsPage />, allowedRoles: adminManagerRoles },
  { path: "/workflows", element: <WorkflowsPage />, allowedRoles: adminManagerRoles },
  { path: "/tasks", element: <TasksPage />, allowedRoles: adminManagerRoles },
  { path: "/meetings", element: <MeetingsPage />, allowedRoles: adminManagerRoles },
  { path: "/employees", element: <EmployeesPage />, allowedRoles: adminManagerRoles },
  { path: "/team-accounts", element: <TeamAccountsPage />, allowedRoles: adminManagerRoles },
  { path: "/messenger", element: <CollaborationHubPage />, allowedRoles: adminManagerRoles },
  { path: "/collaboration", element: <CollaborationHubPage />, allowedRoles: adminManagerRoles },
  { path: "/notifications", element: <NotificationCenterPage />, allowedRoles: adminManagerRoles },
  { path: "/audit-backup", element: <AuditBackupPage />, allowedRoles: adminRoles },
  { path: "/security", element: <SecurityDashboardPage />, allowedRoles: adminRoles },
  { path: "/monitoring", element: <MonitoringDashboardPage />, allowedRoles: adminRoles },
];

export default function App() {
  return (
    <AppProviders quickCreateActions={quickCreateActions} searchItems={workspaceSearchItems}>
      <AnimatedAppRoutes routes={routes} />
    </AppProviders>
  );
}
