import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@shared/ui/button";
import { useInstallPrompt } from "./useInstallPrompt";

const dismissedStorageKey = "ai_bos_install_prompt_dismissed";

export function InstallPrompt() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(
    () => window.localStorage.getItem(dismissedStorageKey) === "true",
  );

  const dismiss = () => {
    window.localStorage.setItem(dismissedStorageKey, "true");
    setDismissed(true);
  };

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) setDismissed(true);
  };

  return (
    <AnimatePresence>
      {canInstall && !dismissed && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-lg border bg-background/95 p-3 shadow-glass backdrop-blur-2xl"
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          role="dialog"
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Download className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Install this app</p>
            <p className="text-xs text-muted-foreground">Add it to your device for faster, offline-ready access.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button onClick={install} size="sm" type="button">
              Install
            </Button>
            <Button aria-label="Dismiss install prompt" onClick={dismiss} size="icon" type="button" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
