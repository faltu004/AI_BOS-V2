import type { RequestHandler } from "express";
import { voiceService } from "../services/voice.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class VoiceController {
  createSession: RequestHandler = async (req, res) => {
    const result = await voiceService.createSession(req.body, req.user!.id);
    sendSuccess(res, 201, { message: "Voice session created", data: result });
  };

  processCommand: RequestHandler = async (req, res) => {
    const sessionId = req.headers["x-voice-session-id"] as string | undefined;
    const result = await voiceService.processCommand(req.body, req.user!.id, sessionId);
    sendSuccess(res, 200, { message: "Voice command processed", data: result });
  };

  getHistory: RequestHandler = async (req, res) => {
    const result = await voiceService.getHistory(req.query as unknown as Parameters<typeof voiceService.getHistory>[0], req.user!.id);
    sendSuccess(res, 200, { message: "Voice history fetched", data: result });
  };

  getPermissions: RequestHandler = async (req, res) => {
    const result = await voiceService.getPermissions(req.user!.id);
    sendSuccess(res, 200, { message: "Voice permissions fetched", data: result });
  };

  stt: RequestHandler = async (req, res) => {
    const audioBuffer = req.file?.buffer;
    const mimeType = req.file?.mimetype ?? "audio/webm";
    const result = await voiceService.processStt(audioBuffer!, mimeType);
    sendSuccess(res, 200, { message: "Speech-to-text processed", data: result });
  };

  tts: RequestHandler = async (req, res) => {
    const { text, voice } = req.body;
    const result = await voiceService.processTts(text, voice);
    sendSuccess(res, 200, { message: "Text-to-speech processed", data: result });
  };
}

export const voiceController = new VoiceController();