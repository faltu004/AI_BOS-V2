import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@shared/ui/button";
import { ToastContext, type ToastInput, type ToastType } from "@shared/ui/toast-context";
import { cn } from "@shared/lib/utils";

type ToastItem = ToastInput & {
  id: string;
  type: ToastType;
};

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const toastStyles = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  error: "border-destructive/20 bg-destructive/10 text-destructive",
  info: "border-primary/20 bg-primary/10 text-primary",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random()}`;
      const item = { ...input, id, type: input.type ?? "info" };
      setItems((current) => [item, ...current].slice(0, 4));
      window.setTimeout(() => removeToast(id), 3600);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6" role="status">
        <AnimatePresence>
          {items.map((item) => {
            const Icon = toastIcons[item.type];
            return (
              <motion.div
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className="pointer-events-auto overflow-hidden rounded-lg border bg-background/94 p-4 shadow-glass backdrop-blur-2xl"
                exit={{ opacity: 0, x: 24, scale: 0.98 }}
                initial={{ opacity: 0, x: 24, scale: 0.98 }}
                key={item.id}
                layout
              >
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border", toastStyles[item.type])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}
                  </div>
                  <Button aria-label="Dismiss notification" onClick={() => removeToast(item.id)} size="icon" type="button" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
