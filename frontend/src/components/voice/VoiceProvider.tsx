import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/toast-context";
import { VoiceButton } from "./VoiceButton";
import type { VoicePermissions, VoiceSessionInfo, VoiceStatus } from "./types";

type VoiceContextValue = {
  status: VoiceStatus;
  permissions: VoicePermissions | null;
  session: VoiceSessionInfo | null;
  isSupported: boolean;
  startVoice: () => void;
  stopVoice: () => void;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}

type VoiceProviderProps = {
  children: ReactNode;
};

export function VoiceProvider({ children }: VoiceProviderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [permissions] = useState<VoicePermissions | null>({
    canUseVoice: true,
    canTranscribe: true,
    canSynthesize: true,
    maxAudioDurationSeconds: 120,
    allowedFormats: ["audio/webm", "audio/wav", "audio/ogg"],
  });
  const [session, setSession] = useState<VoiceSessionInfo | null>(null);

  const isSupported = typeof navigator !== "undefined"
    && "mediaDevices" in navigator
    && "getUserMedia" in navigator.mediaDevices;

  const handleCommand = useCallback(
    (command: string, action: string, params: Record<string, string>, route: string | null) => {
      switch (action) {
        case "navigate":
          if (route) {
            navigate(route);
            toast({
              title: "Voice Command",
              description: `Navigating to ${route}`,
              type: "success",
            });
          }
          break;
        case "quick_create":
          toast({
            title: "Voice Command",
            description: `Opening ${params.type ?? "item"} creation`,
            type: "success",
          });
          if (params.type === "project") navigate("/projects");
          else if (params.type === "task") navigate("/tasks");
          else if (params.type === "invoice") navigate("/finance");
          break;
        case "open_ai_assistant":
          window.dispatchEvent(new CustomEvent("ai-bos:open-ai-assistant"));
          toast({
            title: "Voice Command",
            description: "Opening AI Assistant",
            type: "success",
          });
          break;
        default:
          break;
      }
    },
    [navigate, toast],
  );

  const handleTranscript = useCallback(
    (text: string) => {
      window.dispatchEvent(new CustomEvent("ai-bos:voice-transcript", { detail: { text } }));
    },
    [],
  );

  const startVoice = useCallback(() => {
    setStatus("listening");
  }, []);

  const stopVoice = useCallback(() => {
    setStatus("idle");
  }, []);

  if (!isSupported) {
    return <>{children}</>;
  }

  return (
    <VoiceContext.Provider value={{ status, permissions, session, isSupported, startVoice, stopVoice }}>
      {children}
      <VoiceButton
        onCommand={handleCommand}
        onTranscript={handleTranscript}
        variant="floating"
      />
    </VoiceContext.Provider>
  );
}