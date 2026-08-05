import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
 prompt: () => Promise<void>;
 userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function useInstallPrompt() {
 const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
 const [installed, setInstalled] = useState(false);

 useEffect(() => {
 const onBeforeInstallPrompt = (event: Event) => {
 event.preventDefault();
 setDeferredEvent(event as BeforeInstallPromptEvent);
 };
 const onAppInstalled = () => {
 setInstalled(true);
 setDeferredEvent(null);
 };

 window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
 window.addEventListener("appinstalled", onAppInstalled);
 return () => {
 window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
 window.removeEventListener("appinstalled", onAppInstalled);
 };
 }, []);

 const promptInstall = useCallback(async () => {
 if (!deferredEvent) return false;
 await deferredEvent.prompt();
 const choice = await deferredEvent.userChoice;
 setDeferredEvent(null);
 return choice.outcome === "accepted";
 }, [deferredEvent]);

 return {
 canInstall: deferredEvent !== null && !installed,
 installed,
 promptInstall,
 };
}
