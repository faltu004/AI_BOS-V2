import { motion } from "framer-motion";
import { useEffect, useRef, type FormEventHandler, type ReactNode } from "react";
import { cn } from "@shared/lib/utils";

const FOCUSABLE_SELECTOR =
 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogProps = {
 onClose: () => void;
 children: ReactNode;
 className?: string;
};

type FormDialogProps = DialogProps & {
 as: "form";
 onSubmit: FormEventHandler<HTMLFormElement>;
};

type DivDialogProps = DialogProps & {
 as?: "div";
 onSubmit?: never;
};

function useDialogBehavior(onClose: () => void) {
 const panelRef = useRef<HTMLElement | null>(null);

 useEffect(() => {
 const triggerElement = document.activeElement as HTMLElement | null;
 panelRef.current?.focus();

 function handleKeyDown(event: KeyboardEvent) {
 if (event.key === "Escape") {
 event.preventDefault();
 onClose();
 return;
 }

 if (event.key !== "Tab") return;
 const panel = panelRef.current;
 if (!panel) return;

 const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
 if (focusable.length === 0) return;

 const first = focusable[0];
 const last = focusable[focusable.length - 1];

 if (event.shiftKey && document.activeElement === first) {
 event.preventDefault();
 last.focus();
 } else if (!event.shiftKey && document.activeElement === last) {
 event.preventDefault();
 first.focus();
 }
 }

 document.addEventListener("keydown", handleKeyDown);
 return () => {
 document.removeEventListener("keydown", handleKeyDown);
 triggerElement?.focus?.();
 };
 }, [onClose]);

 return panelRef;
}

/**
 * Accessible overlay + panel shell shared by every record-editing modal.
 * Reuses the overlay/panel markup and motion animation the modals already used
 * inline, and adds role="dialog", a focus trap, and Escape-to-close on top.
 */
export function Dialog({ onClose, children, className, as = "div", onSubmit }: FormDialogProps | DivDialogProps) {
 const panelRef = useDialogBehavior(onClose);
 const panelClassName = cn(
 "max-h-[92vh] w-full overflow-y-auto rounded-lg border bg-background p-4 shadow-glass outline-none sm:p-5",
 className,
 );

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-3 sm:p-4" onMouseDown={onClose}>
 {as === "form" ? (
 <motion.form
 ref={(node) => {
 panelRef.current = node;
 }}
 animate={{ opacity: 1, scale: 1 }}
 className={panelClassName}
 initial={{ opacity: 0, scale: 0.96 }}
 onMouseDown={(event) => event.stopPropagation()}
 onSubmit={onSubmit}
 role="dialog"
 aria-modal="true"
 tabIndex={-1}
 >
 {children}
 </motion.form>
 ) : (
 <motion.div
 ref={(node) => {
 panelRef.current = node;
 }}
 animate={{ opacity: 1, scale: 1 }}
 className={panelClassName}
 initial={{ opacity: 0, scale: 0.96 }}
 onMouseDown={(event) => event.stopPropagation()}
 role="dialog"
 aria-modal="true"
 tabIndex={-1}
 >
 {children}
 </motion.div>
 )}
 </div>
 );
}
