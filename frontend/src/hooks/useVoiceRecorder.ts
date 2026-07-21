import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = {
  status: "idle" | "requesting" | "recording" | "stopped";
  durationMs: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
};

type UseVoiceRecorderOptions = {
  maxDurationMs?: number;
  onAudioReady?: (blob: Blob) => void;
};

type UseVoiceRecorderReturn = RecorderState & {
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  amplitude: number;
};

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const { maxDurationMs = 30_000, onAudioReady } = options;

  const [state, setState] = useState<RecorderState>({
    status: "idle",
    durationMs: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });
  const [amplitude, setAmplitude] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
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
    animationFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, []);

  const start = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: "requesting", error: null }));
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
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
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setState((prev) => ({
          ...prev,
          status: "stopped",
          audioBlob: blob,
          audioUrl: url,
          durationMs: Date.now() - startTimeRef.current,
        }));
        stream.getTracks().forEach((track) => track.stop());
        onAudioReady?.(blob);
        cleanup();
        setAmplitude(0);
      };

      recorder.onerror = () => {
        setState((prev) => ({
          ...prev,
          status: "idle",
          error: "Recording failed",
        }));
        stream.getTracks().forEach((track) => track.stop());
        cleanup();
      };

      recorder.start(250);
      setState((prev) => ({ ...prev, status: "recording", durationMs: 0 }));

      timerRef.current = setInterval(() => {
        setState((prev) => {
          const elapsed = Date.now() - startTimeRef.current;
          if (elapsed >= maxDurationMs) {
            recorder.stop();
            return { ...prev, durationMs: maxDurationMs };
          }
          return { ...prev, durationMs: elapsed };
        });
      }, 100);

      updateAmplitude();
    } catch (error) {
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access denied"
        : "Unable to start recording";
      setState((prev) => ({ ...prev, status: "idle", error: message }));
    }
  }, [maxDurationMs, onAudioReady, cleanup, updateAmplitude]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState({
      status: "idle",
      durationMs: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
    });
    setAmplitude(0);
  }, [cleanup, state.audioUrl]);

  useEffect(() => {
    return () => {
      cleanup();
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    };
  }, [cleanup, state.audioUrl]);

  return {
    ...state,
    start,
    stop,
    reset,
    amplitude,
  };
}