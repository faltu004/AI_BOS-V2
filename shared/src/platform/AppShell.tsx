import { lazy, memo, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import { filterByRole, getStoredAuthRole, RequireAuth } from "@shared/auth/access-control";
import type { AuthRole } from "@shared/auth/types";
import { ConfirmDialogProvider } from "@shared/ui/confirm-dialog";
import { PageSkeleton } from "@shared/ui/page-skeleton";
import { ToastProvider } from "@shared/ui/toast";
import type { QuickCreateAction, WorkspaceSearchItem } from "./types";

export type AppRouteConfig = {
  path: string;
  element: ReactNode;
  allowedRoles?: readonly AuthRole[];
};

export function lazyNamed<TModule extends Record<string, unknown>, TName extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TName,
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType<any> };
  });
}

function AppFallback() {
  return <PageSkeleton />;
}

const LazyAppExperience = lazyNamed(() => import("./AppExperience"), "AppExperience");
const LazyCommandPalette = lazyNamed(() => import("./CommandPalette"), "CommandPalette");
const LazyFloatingQuickAction = lazyNamed(() => import("./FloatingQuickAction"), "FloatingQuickAction");
const LazyFloatingAIAssistant = lazyNamed(() => import("@shared/ai"), "FloatingAIAssistant");
const LazyPwaChrome = lazyNamed(() => import("@shared/pwa"), "PwaChrome");

function useIdleMount() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => setMounted(true), { timeout: 600 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const timeout = window.setTimeout(() => setMounted(true), 1);
    return () => window.clearTimeout(timeout);
  }, []);

  return mounted;
}

function getRouteElement(route: AppRouteConfig) {
  if (!route.allowedRoles) {
    return route.element;
  }

  return <RequireAuth allowedRoles={route.allowedRoles}>{route.element}</RequireAuth>;
}

export function AnimatedAppRoutes({ routes }: { routes: readonly AppRouteConfig[] }) {
  const location = useLocation();

  return (
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
            {routes.map((route) => (
              <Route element={getRouteElement(route)} key={route.path} path={route.path} />
            ))}
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}

function useVisibleWorkspaceControls({
  quickCreateActions,
  searchItems,
}: {
  quickCreateActions: readonly QuickCreateAction[];
  searchItems: readonly WorkspaceSearchItem[];
}) {
  const location = useLocation();
  const currentRole = useMemo(() => getStoredAuthRole(), [location.key]);

  return useMemo(
    () => ({
      visibleQuickCreateActions: filterByRole(quickCreateActions, currentRole),
      visibleSearchItems: filterByRole(searchItems, currentRole),
    }),
    [currentRole, quickCreateActions, searchItems],
  );
}

const WorkspaceChrome = memo(function WorkspaceChrome({
  quickCreateActions,
  searchItems,
}: {
  quickCreateActions: readonly QuickCreateAction[];
  searchItems: readonly WorkspaceSearchItem[];
}) {
  const { visibleQuickCreateActions, visibleSearchItems } = useVisibleWorkspaceControls({
    quickCreateActions,
    searchItems,
  });

  return (
    <>
      <LazyCommandPalette items={visibleSearchItems} />
      <LazyFloatingQuickAction actions={visibleQuickCreateActions} />
      <LazyFloatingAIAssistant />
      <LazyAppExperience items={visibleSearchItems} />
      <LazyPwaChrome />
    </>
  );
});

export function AppProviders({
  children,
  quickCreateActions,
  searchItems,
}: {
  children: ReactNode;
  quickCreateActions: readonly QuickCreateAction[];
  searchItems: readonly WorkspaceSearchItem[];
}) {
  const chromeMounted = useIdleMount();

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        {children}
        {chromeMounted ? (
          <Suspense fallback={null}>
            <WorkspaceChrome quickCreateActions={quickCreateActions} searchItems={searchItems} />
          </Suspense>
        ) : null}
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
