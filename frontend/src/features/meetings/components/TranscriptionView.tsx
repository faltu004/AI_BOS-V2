import { useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MeetingTranscription, MeetingSegment } from "../meeting-ai.types";

type TranscriptionViewProps = {
  transcription: MeetingTranscription;
  className?: string;
};

export function TranscriptionView({ transcription, className }: TranscriptionViewProps) {
  const [playingSegment, setPlayingSegment] = useState<number | null>(null);

  const togglePlay = (index: number) => {
    setPlayingSegment(playingSegment === index ? null : index);
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Transcription</h3>
          <span className="text-xs text-muted-foreground">
            {transcription.segments.length} segments • {Math.floor(transcription.duration / 60)} min
          </span>
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto">
          {transcription.segments.map((segment: MeetingSegment, index: number) => (
            <div
              className={`rounded-lg border p-3 transition-colors ${
                playingSegment === index ? "border-primary bg-primary/5" : "bg-background/65"
              }`}
              key={index}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">{segment.speaker}</span>
                    <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(segment.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm">{segment.text}</p>
                </div>
                <Button
                  aria-label={playingSegment === index ? "Pause" : "Play"}
                  onClick={() => togglePlay(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {playingSegment === index ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border bg-background/65 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Volume2 className="h-4 w-4" />
            Full Text
          </div>
          <p className="mt-2 text-sm leading-relaxed">{transcription.full_text}</p>
        </div>
      </CardContent>
    </Card>
  );
}