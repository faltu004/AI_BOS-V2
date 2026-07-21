import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppExperience } from "@/components/platform/AppExperience";
import { AIAssistant } from "@/components/platform/AIAssistant";
import { CommandPalette } from "@/components/platform/CommandPalette";
import { FloatingQuickAction } from "@/components/platform/FloatingQuickAction";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ToastProvider } from "@/components/ui/toast";
import { VoiceProvider } from "@/components/voice/VoiceProvider";

const HomePage = lazy(() =>
  import("@/pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const LoginPage = lazy(() =>
  import("@/features/auth/login").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("@/features/auth/pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/pages/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("@/features/auth/pages/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const EmailVerificationPage = lazy(() =>
  import("@/features/auth/pages/EmailVerificationPage").then((module) => ({
    default: module.EmailVerificationPage,
  })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.DashboardPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/features/profile").then((module) => ({
    default: module.ProfilePage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings").then((module) => ({
    default: module.SettingsPage,
  })),
);
const ProjectsPage = lazy(() =>
  import("@/features/projects").then((module) => ({
    default: module.ProjectsPage,
  })),
);
const ProjectDetailsPage = lazy(() =>
  import("@/features/projects").then((module) => ({
    default: module.ProjectDetailsPage,
  })),
);
const TasksPage = lazy(() =>
  import("@/features/tasks").then((module) => ({
    default: module.TasksPage,
  })),
);
const EmployeesPage = lazy(() =>
  import("@/features/employees").then((module) => ({
    default: module.EmployeesPage,
  })),
);
const CrmPage = lazy(() =>
  import("@/features/crm").then((module) => ({
    default: module.CrmPage,
  })),
);
const FinancePage = lazy(() =>
  import("@/features/finance").then((module) => ({
    default: module.FinancePage,
  })),
);
const ProductsPage = lazy(() =>
  import("@/features/products").then((module) => ({
    default: module.ProductsPage,
  })),
);
const DocumentsPage = lazy(() =>
  import("@/features/documents").then((module) => ({
    default: module.DocumentsPage,
  })),
);
const KnowledgePage = lazy(() =>
  import("@/features/rag").then((module) => ({
    default: module.KnowledgePage,
  })),
);
const MeetingsPage = lazy(() =>
  import("@/features/meetings").then((module) => ({
    default: module.MeetingsPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import("@/features/analytics").then((module) => ({
    default: module.AnalyticsPage,
  })),
);
const BusinessIntelligencePage = lazy(() =>
  import("@/features/business-intelligence").then((module) => ({
    default: module.BusinessIntelligencePage,
  })),
);
const AdminPage = lazy(() =>
  import("@/features/admin").then((module) => ({
    default: module.AdminPage,
  })),
);
const AIConfigurationPage = lazy(() =>
  import("@/features/admin-ai-config").then((module) => ({
    default: module.AIConfigurationPage,
  })),
);
const MultiAgentPage = lazy(() =>
  import("@/features/multi-agent").then((module) => ({
    default: module.MultiAgentPage,
  })),
);
const WorkflowsPage = lazy(() =>
  import("@/features/workflows").then((module) => ({
    default: module.WorkflowsPage,
  })),
);
const ReportGeneratorPage = lazy(() =>
  import("@/features/reports").then((module) => ({
    default: module.ReportGeneratorPage,
  })),
);
const IntegrationsPage = lazy(() =>
  import("@/features/integrations").then((module) => ({
    default: module.IntegrationsPage,
  })),
);
const MemoryPage = lazy(() =>
  import("@/features/memory").then((module) => ({
    default: module.MemoryPage,
  })),
);
const ConsultantPage = lazy(() =>
  import("@/features/consultant").then((module) => ({
    default: module.ConsultantPage,
  })),
);
const CopilotPage = lazy(() =>
  import("@/features/copilot").then((module) => ({
    default: module.CopilotPage,
  })),
);

function AppFallback() {
  return <PageSkeleton />;
}

export default function App() {
  const location = useLocation();

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <Suspense fallback={<AppFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: 10 }}
              key={location.pathname}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />
                <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/crm" element={<CrmPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/knowledge" element={<KnowledgePage />} />
                <Route path="/meetings" element={<MeetingsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/business-intelligence" element={<BusinessIntelligencePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/ai-config" element={<AIConfigurationPage />} />
                <Route path="/multi-agent" element={<MultiAgentPage />} />
                <Route path="/workflows" element={<WorkflowsPage />} />
                <Route path="/reports" element={<ReportGeneratorPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/memory" element={<MemoryPage />} />
                <Route path="/consultant" element={<ConsultantPage />} />
                <Route path="/copilot" element={<CopilotPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
        <VoiceProvider>
          <CommandPalette />
          <AIAssistant />
          <FloatingQuickAction />
          <AppExperience />
        </VoiceProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
