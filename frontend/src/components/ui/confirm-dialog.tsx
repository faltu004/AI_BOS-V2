import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmContext, type ConfirmOptions } from "@/components/ui/confirm-dialog-context";

type ConfirmRequest = ConfirmOptions & {
  onResolve: (value: boolean) => void;
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ ...options, onResolve: resolve });
    });
  }, []);

  const close = (value: boolean) => {
    request?.onResolve(value);
    setRequest(null);
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {request && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border bg-background/95 p-5 shadow-glass backdrop-blur-2xl"
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <TriangleAlert className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{request.title}</h2>
                  {request.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{request.description}</p>}
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button onClick={() => close(false)} type="button" variant="outline">
                  {request.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  className={request.tone === "danger" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
                  onClick={() => close(true)}
                  type="button"
                >
                  {request.confirmLabel ?? "Confirm"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
