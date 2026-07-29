import { AnimatedAppRoutes, AppProviders, lazyNamed, type AppRouteConfig } from "@shared/platform/AppShell";
import { workspaceSearchItems, quickCreateActions, financeRoles, frontlineRoles, hrRoles, salesRoles } from "@/data/workspace";

const HomePage = lazyNamed(() => import("@/pages/HomePage"), "HomePage");
const LoginPage = lazyNamed(() => import("@/features/auth/login"), "LoginPage");
const ForgotPasswordPage = lazyNamed(() => import("@/features/auth/pages/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyNamed(() => import("@/features/auth/pages/ResetPasswordPage"), "ResetPasswordPage");
const EmailVerificationPage = lazyNamed(() => import("@/features/auth/pages/EmailVerificationPage"), "EmailVerificationPage");
const DashboardPage = lazyNamed(() => import("@/common/features/dashboard"), "DashboardPage");
const ProfilePage = lazyNamed(() => import("@/common/features/profile"), "ProfilePage");
const TasksPage = lazyNamed(() => import("@/common/features/tasks"), "TasksPage");
const EmployeesPage = lazyNamed(() => import("@/hr/features/employees"), "EmployeesPage");
const CrmPage = lazyNamed(() => import("@/sale/features/crm"), "CrmPage");
const FinancePage = lazyNamed(() => import("@/sale/features/finance"), "FinancePage");
const ProductsPage = lazyNamed(() => import("@/sale/features/products"), "ProductsPage");
const DocumentsPage = lazyNamed(() => import("@/common/features/documents"), "DocumentsPage");
const MeetingsPage = lazyNamed(() => import("@/common/features/meetings"), "MeetingsPage");
const CollaborationHubPage = lazyNamed(() => import("@/common/features/collaboration"), "CollaborationHubPage");
const NotificationCenterPage = lazyNamed(() => import("@/common/features/notifications"), "NotificationCenterPage");
const TeamAccountsPage = lazyNamed(() => import("@/common/features/team-accounts"), "TeamAccountsPage");

const routes: AppRouteConfig[] = [
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/reset-password/:token", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <EmailVerificationPage /> },
  { path: "/verify-email/:token", element: <EmailVerificationPage /> },
  { path: "/dashboard", element: <DashboardPage />, allowedRoles: frontlineRoles },
  { path: "/profile", element: <ProfilePage />, allowedRoles: frontlineRoles },
  { path: "/tasks", element: <TasksPage />, allowedRoles: frontlineRoles },
  { path: "/employees", element: <EmployeesPage />, allowedRoles: hrRoles },
  { path: "/team-accounts", element: <TeamAccountsPage />, allowedRoles: frontlineRoles },
  { path: "/crm", element: <CrmPage />, allowedRoles: salesRoles },
  { path: "/finance", element: <FinancePage />, allowedRoles: financeRoles },
  { path: "/products", element: <ProductsPage />, allowedRoles: salesRoles },
  { path: "/documents", element: <DocumentsPage />, allowedRoles: frontlineRoles },
  { path: "/meetings", element: <MeetingsPage />, allowedRoles: frontlineRoles },
  { path: "/messenger", element: <CollaborationHubPage />, allowedRoles: frontlineRoles },
  { path: "/collaboration", element: <CollaborationHubPage />, allowedRoles: frontlineRoles },
  { path: "/notifications", element: <NotificationCenterPage />, allowedRoles: frontlineRoles },
];

export default function App() {
  return (
    <AppProviders quickCreateActions={quickCreateActions} searchItems={workspaceSearchItems}>
      <AnimatedAppRoutes routes={routes} />
    </AppProviders>
  );
}
