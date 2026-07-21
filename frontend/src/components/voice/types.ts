export type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "error";

export type VoiceCommandResult = {
  command: string | null;
  action: string;
  params: Record<string, string>;
  route: string | null;
  confidence: number;
  interactionId: string;
};

export type VoiceTranscriptionResult = {
  text: string;
  confidence: number;
  duration: number;
  language: string;
};

export type VoicePermissions = {
  canUseVoice: boolean;
  canTranscribe: boolean;
  canSynthesize: boolean;
  maxAudioDurationSeconds: number;
  allowedFormats: string[];
};

export type VoiceInteraction = {
  _id: string;
  userId: string;
  sessionId: string;
  text: string;
  command?: string;
  action?: string;
  confidence?: number;
  duration?: number;
  success: boolean;
  createdAt: string;
};

export type VoiceHistoryResponse = {
  interactions: VoiceInteraction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type VoiceSessionInfo = {
  sessionId: string;
  expiresAt: string;
};