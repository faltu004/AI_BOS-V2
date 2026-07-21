import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type VoiceWaveformProps = {
  amplitude: number;
  isActive: boolean;
  barCount?: number;
  className?: string;
};

export function VoiceWaveform({ amplitude, isActive, barCount = 32, className }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const gap = 2;
    const barWidth = (width - gap * (barCount - 1)) / barCount;

    let animationId: number;

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (let i = 0; i < barCount; i++) {
        let barHeight: number;

        if (!isActive) {
          barHeight = 2;
        } else {
          const normalizedIndex = i / barCount;
          const randomFactor = Math.sin(normalizedIndex * Math.PI * 4 + Date.now() * 0.008) * 0.3 + 0.7;
          barHeight = Math.max(2, amplitude * height * 0.8 * randomFactor);
        }

        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        const gradient = ctx!.createLinearGradient(x, y, x, y + barHeight);
        if (isActive) {
          gradient.addColorStop(0, "hsl(var(--primary))");
          gradient.addColorStop(1, "hsl(var(--primary) / 0.6)");
        } else {
          gradient.addColorStop(0, "hsl(var(--muted-foreground))");
          gradient.addColorStop(1, "hsl(var(--muted-foreground) / 0.3)");
        }

        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, barWidth / 2, barWidth / 2]);
        ctx!.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [amplitude, isActive, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-12 w-full", className)}
      role="img"
      aria-label={isActive ? "Voice waveform - recording" : "Voice waveform - idle"}
    />
  );
}