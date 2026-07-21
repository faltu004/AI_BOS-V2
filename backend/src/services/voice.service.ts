import { nanoid } from "nanoid";
import { VoiceSessionModel } from "../models/voice-session.model.js";
import { VoiceInteractionModel } from "../models/voice-interaction.model.js";
import { AppError } from "../utils/app-error.js";
import { voiceTriggers, voiceCommandMappings, type VoiceCommand } from "../constants/voice-commands.js";
import type { CreateVoiceSessionInput, VoiceCommandInput, VoiceHistoryQueryInput } from "../validation/voice.validation.js";

function matchCommand(text: string): { command: VoiceCommand; confidence: number } | null {
  const normalized = text.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");

  for (const [trigger, command] of Object.entries(voiceTriggers)) {
    if (normalized === trigger || normalized.startsWith(trigger)) {
      return { command, confidence: 0.95 };
    }
  }

  const words = normalized.split(/\s+/);
  for (const [trigger, command] of Object.entries(voiceTriggers)) {
    const triggerWords = trigger.split(/\s+/);
    const matchCount = triggerWords.filter((word) => words.includes(word)).length;
    if (matchCount >= Math.min(2, triggerWords.length)) {
      const confidence = matchCount / triggerWords.length;
      if (confidence >= 0.6) {
        return { command, confidence };
      }
    }
  }

  return null;
}

export class VoiceService {
  async createSession(input: CreateVoiceSessionInput, userId: string) {
    const sessionId = `vs_${nanoid(16)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    const session = await VoiceSessionModel.create({
      userId,
      sessionId,
      isActive: true,
      startedAt: now,
      expiresAt,
      deviceInfo: input.deviceInfo,
    });

    return {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
    };
  }

  async processCommand(input: VoiceCommandInput, userId: string, sessionId?: string) {
    const matched = matchCommand(input.text);
    const interaction = await VoiceInteractionModel.create({
      userId,
      sessionId: sessionId ?? `anon_${Date.now()}`,
      text: input.text,
      command: matched?.command ?? undefined,
      action: matched ? voiceCommandMappings[matched.command].action : undefined,
      confidence: matched?.confidence,
      success: Boolean(matched),
    });

    if (matched) {
      const mapping = voiceCommandMappings[matched.command];
      return {
        command: matched.command,
        action: mapping.action,
        params: mapping.params ?? {},
        route: mapping.route ?? null,
        confidence: matched.confidence,
        interactionId: interaction.id,
      };
    }

    return {
      command: null,
      action: "chat_query",
      params: { text: input.text },
      route: null,
      confidence: 0,
      interactionId: interaction.id,
    };
  }

  async getHistory(query: VoiceHistoryQueryInput, userId: string) {
    const skip = (query.page - 1) * query.limit;
    const [interactions, total] = await Promise.all([
      VoiceInteractionModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      VoiceInteractionModel.countDocuments({ userId }),
    ]);

    return {
      interactions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getPermissions(userId: string) {
    return {
      canUseVoice: true,
      canTranscribe: true,
      canSynthesize: true,
      maxAudioDurationSeconds: 120,
      allowedFormats: ["audio/webm", "audio/wav", "audio/ogg"],
    };
  }

  async processStt(audioBuffer: Buffer, mimeType: string) {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new AppError("Audio data is required", 400);
    }

    if (audioBuffer.length > 10 * 1024 * 1024) {
      throw new AppError("Audio file too large. Maximum size is 10MB", 400);
    }

    return {
      text: "",
      confidence: 0,
      duration: 0,
      message: "Audio received. Forwarding to AI service for transcription.",
    };
  }

  async processTts(text: string, _voice?: string) {
    if (!text.trim()) {
      throw new AppError("Text is required for speech synthesis", 400);
    }

    return {
      message: "Text received. Forwarding to AI service for speech synthesis.",
      text,
    };
  }
}

export const voiceService = new VoiceService();