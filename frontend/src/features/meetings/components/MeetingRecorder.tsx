import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MeetingRecordingStatus } from "../meeting-ai.types";

type MeetingRecorderProps = {
  meetingId: string;
  onRecordingComplete: (audioBlob: Blob) => void;
  className?: string;
};

export function MeetingRecorder({ meetingId, onRecordingComplete, className }: MeetingRecorderProps) {
  const [status, setStatus] = useState<MeetingRecordingStatus>("idle");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setStatus("recording");
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setStatus("failed");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("processing");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardContent className="p-5">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${status === "recording" ? "animate-pulse bg-rose-500" : "bg-muted-foreground"}`} />
            <span className="text-sm font-semibold">
              {status === "idle" && "Ready to record"}
              {status === "recording" && "Recording..."}
              {status === "processing" && "Processing..."}
              {status === "completed" && "Recording complete"}
              {status === "failed" && "Recording failed"}
            </span>
          </div>

          <div className="text-4xl font-bold tabular-nums">{formatDuration(duration)}</div>

          <div className="flex gap-2">
            {status === "idle" && (
              <Button onClick={startRecording} type="button">
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            )}
            {status === "recording" && (
              <Button onClick={stopRecording} type="button" variant="secondary">
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            )}
            {status === "processing" && (
              <Button disabled type="button">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}