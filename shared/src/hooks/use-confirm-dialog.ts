import { useCallback } from "react";
import { useConfirm } from "@shared/ui/confirm-dialog-context";

type ConfirmOptions = {
 title: string;
 description?: string;
 confirmLabel?: string;
 tone?: "default" | "danger";
};

export function useConfirmDialog() {
 const { confirm } = useConfirm();

 const confirmAction = useCallback(
 async (options: ConfirmOptions): Promise<boolean> => {
 return await confirm({
 title: options.title,
 description: options.description,
 confirmLabel: options.confirmLabel,
 tone: options.tone,
 });
 },
 [confirm],
 );

 return { confirmAction };
}
