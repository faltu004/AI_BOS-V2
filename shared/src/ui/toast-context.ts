import { createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastInput = {
 title: string;
 description?: string;
 type?: ToastType;
};

export type ToastContextValue = {
 toast: (input: ToastInput) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
 const context = useContext(ToastContext);
 if (!context) {
 throw new Error("useToast must be used inside ToastProvider");
 }
 return context;
}
