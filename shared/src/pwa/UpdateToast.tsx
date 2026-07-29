import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@shared/ui/button";
import { useToast } from "@shared/ui/toast-context";
import { usePwaUpdate } from "./usePwaUpdate";

export function UpdateToast() {
  const { needsRefresh, offlineReady, applyUpdate, dismissOfflineReady } = usePwaUpdate();
  const { toast } = useToast();

  useEffect(() => {
    if (!offlineReady) return;
    toast({ title: "Ready for offline use", description: "This app can now load without an internet connection.", type: "success" });
    dismissOfflineReady();
  }, [offlineReady, toast, dismissOfflineReady]);

  return (
    <AnimatePresence>
      {needsRefresh && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed right-4 top-20 z-[85] flex max-w-xs items-center gap-3 rounded-lg border bg-background/95 p-3 shadow-glass backdrop-blur-2xl sm:right-6"
          exit={{ opacity: 0, y: -12 }}
          initial={{ opacity: 0, y: -12 }}
          role="status"
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <RefreshCw className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Update available</p>
            <p className="text-xs text-muted-foreground">Refresh to get the latest version.</p>
          </div>
          <Button onClick={() => void applyUpdate()} size="sm" type="button">
            Refresh
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
