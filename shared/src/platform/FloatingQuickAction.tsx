import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { quickActionsOpenEvent } from "./events";
import type { QuickCreateAction } from "./types";

function isWorkspaceRoute(pathname: string) {
  return !["/", "/login", "/forgot-password"].some((route) => pathname === route)
    && !pathname.startsWith("/reset-password")
    && !pathname.startsWith("/verify-email");
}

export const FloatingQuickAction = memo(function FloatingQuickAction({ actions }: { actions: QuickCreateAction[] }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const closeActions = useCallback(() => setOpen(false), []);
  const toggleOpen = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    const openActions = () => setOpen(true);
    window.addEventListener(quickActionsOpenEvent, openActions);
    return () => window.removeEventListener(quickActionsOpenEvent, openActions);
  }, []);

  if (!isWorkspaceRoute(location.pathname)) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 grid w-56 gap-2 rounded-lg border bg-background/94 p-2 shadow-glass backdrop-blur-2xl"
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 12 }}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  key={action.label}
                  onClick={closeActions}
                  to={action.href}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  Create {action.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow"
        onClick={toggleOpen}
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </motion.button>
    </div>
  );
});
