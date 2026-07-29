import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "./useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-sm font-semibold text-amber-950 shadow-md"
          exit={{ y: -40, opacity: 0 }}
          initial={{ y: -40, opacity: 0 }}
          role="status"
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <WifiOff className="h-4 w-4" />
          You&apos;re offline — showing previously loaded data. Changes will sync automatically once you&apos;re back online.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
