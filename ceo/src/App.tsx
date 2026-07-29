import { Navigate } from "react-router-dom";
import { AnimatedAppRoutes, AppProviders, lazyNamed, type AppRouteConfig } from "@shared/platform/AppShell";
import { workspaceSearchItems, quickCreateActions } from "@/data/workspace";

const executiveRoles = ["Owner", "Administrator"] as const;

const LoginPage = lazyNamed(() => import("@/features/auth/login"), "LoginPage");
const ForgotPasswordPage = lazyNamed(() => import("@/features/auth/pages/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyNamed(() => import("@/features/auth/pages/ResetPasswordPage"), "ResetPasswordPage");
const EmailVerificationPage = lazyNamed(() => import("@/features/auth/pages/EmailVerificationPage"), "EmailVerificationPage");
const DashboardPage = lazyNamed(() => import("@/ceo/features/dashboard"), "DashboardPage");
const AnalyticsPage = lazyNamed(() => import("@/ceo/features/analytics"), "AnalyticsPage");
const FinancePage = lazyNamed(() => import("@/ceo/features/finance"), "FinancePage");
const ProjectsPage = lazyNamed(() => import("@/ceo/features/projects"), "ProjectsPage");
const ProjectDetailsPage = lazyNamed(() => import("@/ceo/features/projects"), "ProjectDetailsPage");
const WorkflowsPage = lazyNamed(() => import("@/ceo/features/workflows"), "WorkflowsPage");
const ExecutiveAccessPage = lazyNamed(() => import("@/ceo/features/access"), "ExecutiveAccessPage");
const CollaborationHubPage = lazyNamed(() => import("@/ceo/features/collaboration"), "CollaborationHubPage");
const NotificationCenterPage = lazyNamed(() => import("@/ceo/features/notifications"), "NotificationCenterPage");
const ProfilePage = lazyNamed(() => import("@shared/profile/RoleProfilePage"), "RoleProfilePage");
const TeamAccountsPage = lazyNamed(() => import("@/ceo/features/team-accounts"), "TeamAccountsPage");
const EmployeesPage = lazyNamed(() => import("@/ceo/features/employees"), "EmployeesPage");

const routes: AppRouteConfig[] = [
  { path: "/", element: <Navigate replace to="/dashboard" /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/reset-password/:token", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <EmailVerificationPage /> },
  { path: "/verify-email/:token", element: <EmailVerificationPage /> },
  { path: "/dashboard", element: <DashboardPage />, allowedRoles: executiveRoles },
  { path: "/team-accounts", element: <TeamAccountsPage />, allowedRoles: executiveRoles },
  { path: "/admin", element: <ExecutiveAccessPage moduleKey="admin" />, allowedRoles: executiveRoles },
  { path: "/analytics", element: <AnalyticsPage />, allowedRoles: executiveRoles },
  { path: "/finance", element: <FinancePage />, allowedRoles: executiveRoles },
  { path: "/projects", element: <ProjectsPage />, allowedRoles: executiveRoles },
  { path: "/projects/:id", element: <ProjectDetailsPage />, allowedRoles: executiveRoles },
  { path: "/workflows", element: <WorkflowsPage />, allowedRoles: executiveRoles },
  { path: "/crm", element: <ExecutiveAccessPage moduleKey="crm" />, allowedRoles: executiveRoles },
  { path: "/documents", element: <ExecutiveAccessPage moduleKey="documents" />, allowedRoles: executiveRoles },
  { path: "/employees", element: <EmployeesPage />, allowedRoles: executiveRoles },
  { path: "/integrations", element: <ExecutiveAccessPage moduleKey="integrations" />, allowedRoles: executiveRoles },
  { path: "/organization", element: <ExecutiveAccessPage moduleKey="organization" />, allowedRoles: executiveRoles },
  { path: "/rbac", element: <ExecutiveAccessPage moduleKey="rbac" />, allowedRoles: executiveRoles },
  { path: "/products", element: <ExecutiveAccessPage moduleKey="products" />, allowedRoles: executiveRoles },
  { path: "/profile", element: <ProfilePage />, allowedRoles: executiveRoles },
  { path: "/settings", element: <ExecutiveAccessPage moduleKey="settings" />, allowedRoles: executiveRoles },
  { path: "/tasks", element: <ExecutiveAccessPage moduleKey="tasks" />, allowedRoles: executiveRoles },
  { path: "/messenger", element: <CollaborationHubPage />, allowedRoles: executiveRoles },
  { path: "/collaboration", element: <CollaborationHubPage />, allowedRoles: executiveRoles },
  { path: "/notifications", element: <NotificationCenterPage />, allowedRoles: executiveRoles },
  { path: "/audit-backup", element: <ExecutiveAccessPage moduleKey="audit-backup" />, allowedRoles: executiveRoles },
];

export default function App() {
  return (
    <AppProviders quickCreateActions={quickCreateActions} searchItems={workspaceSearchItems}>
      <AnimatedAppRoutes routes={routes} />
    </AppProviders>
  );
}
