import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, MicOff, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-context";
import { cn } from "@/lib/utils";
import { VoiceStatusIndicator } from "./VoiceStatusIndicator";
import { VoiceWaveform } from "./VoiceWaveform";
import type { VoiceStatus } from "./types";

type VoiceButtonProps = {
  onTranscript?: (text: string) => void;
  onCommand?: (command: string, action: string, params: Record<string, string>, route: string | null) => void;
  size?: "sm" | "md" | "lg";
  variant?: "floating" | "inline" | "icon";
  className?: string;
};

export function VoiceButton({
  onTranscript,
  onCommand,
  size = "md",
  variant = "inline",
  className,
}: VoiceButtonProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (analyserRef.current) analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setAmplitude(0);
  }, []);

  const updateAmplitude = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const value = Math.abs(data[i] - 128);
      if (value > max) max = value;
    }
    setAmplitude(max / 128);
    animationRef.current = requestAnimationFrame(updateAmplitude);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setStatus("listening");
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setRecording(false);
        setStatus("processing");
        cleanup();
        processAudio(blob);
      };

      recorder.onerror = () => {
        setStatus("error");
        setRecording(false);
        cleanup();
        toast({ title: "Recording failed", description: "An error occurred while recording.", type: "error" });
      };

      recorder.start(250);
      setRecording(true);
      setPanelOpen(true);

      timerRef.current = setInterval(() => {
        setDurationMs((prev) => {
          if (prev >= 30_000) {
            recorder.stop();
            return 30_000;
          }
          return prev + 100;
        });
      }, 100);

      updateAmplitude();
    } catch (error) {
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access denied. Please allow microphone permissions."
        : "Unable to start recording";
      setStatus("error");
      toast({ title: "Microphone error", description: message, type: "error" });
    }
  }, [toast, cleanup, updateAmplitude]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processAudio = useCallback(async (blob: Blob) => {
    try {
      setStatus("processing");

      const backendUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://127.0.0.1:5000/api/v1";

      const formData = new FormData();
      formData.append("audio", blob, "voice.webm");

      const response = await fetch(`${backendUrl}/voice/stt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("ai_bos_auth_session") ? JSON.parse(localStorage.getItem("ai_bos_auth_session")!).accessToken : ""}`,
        },
        body: formData,
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      const result = await response.json();
      const text = result.data?.text ?? "";

      if (text) {
        setStatus("speaking");
        const commandResponse = await fetch(`${backendUrl}/voice/commands`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("ai_bos_auth_session") ? JSON.parse(localStorage.getItem("ai_bos_auth_session")!).accessToken : ""}`,
          },
          body: JSON.stringify({ text }),
        });

        if (commandResponse.ok) {
          const commandResult = await commandResponse.json();
          if (commandResult.data?.command) {
            onCommand?.(
              commandResult.data.command,
              commandResult.data.action,
              commandResult.data.params ?? {},
              commandResult.data.route ?? null,
            );
          } else {
            onTranscript?.(text);
          }
        } else {
          onTranscript?.(text);
        }

        setTimeout(() => setStatus("idle"), 1000);
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("error");
    }
  }, [onCommand, onTranscript]);

  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === "M") {
        event.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleRecording]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  if (variant === "floating") {
    return (
      <>
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="fixed bottom-28 right-6 z-[60] w-72 overflow-hidden rounded-3xl border bg-background/95 p-4 shadow-glass backdrop-blur-2xl"
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <VoiceStatusIndicator status={status} />
                <button
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  onClick={() => setPanelOpen(false)}
                  type="button"
                  aria-label="Close voice panel"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              </div>
              <VoiceWaveform amplitude={amplitude} isActive={recording} />
              {recording && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {Math.floor(durationMs / 1000)}s / 30s
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          aria-label={recording ? "Stop recording" : "Start voice recording"}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow transition-all",
            recording
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "bg-foreground text-background dark:bg-white dark:text-slate-950",
            className,
          )}
          onClick={toggleRecording}
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </motion.button>
      </>
    );
  }

  if (variant === "icon") {
    return (
      <button
        aria-label={recording ? "Stop recording" : "Start voice recording"}
        className={cn(
          "flex items-center justify-center rounded-full transition-all",
          recording && "text-destructive animate-pulse",
          size === "sm" ? "h-8 w-8" : "h-10 w-10",
          className,
        )}
        onClick={toggleRecording}
        type="button"
      >
        {status === "processing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mic className={cn("h-4 w-4", recording && "text-destructive")} />
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        aria-label={recording ? "Stop recording" : "Start voice recording"}
        className={cn(
          "relative overflow-hidden transition-all",
          recording && "bg-destructive hover:bg-destructive/90",
          size === "sm" && "h-8 px-2 text-xs",
          size === "lg" && "h-12 px-5 text-base",
        )}
        onClick={toggleRecording}
        type="button"
        variant={recording ? "default" : "outline"}
      >
        {status === "processing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : recording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span className="ml-2">{recording ? "Stop" : "Voice"}</span>
      </Button>
      {recording && (
        <span className="animate-pulse text-xs font-semibold text-destructive">
          {Math.floor(durationMs / 1000)}s
        </span>
      )}
    </div>
  );
}