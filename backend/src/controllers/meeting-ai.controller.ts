import type { RequestHandler } from "express";
import { meetingAIService } from "../services/meeting-ai.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { validate } from "../middleware/validate.middleware.js";
import { meetingTranscribeSchema, meetingSummarizeSchema, meetingExtractActionsSchema, meetingExtractDecisionsSchema, meetingGenerateReportSchema } from "../validation/meeting-ai.validation.js";

export class MeetingAIController {
  transcribe: RequestHandler = async (req, res) => {
    const result = await meetingAIService.transcribeMeeting({ meeting_id: req.params.meetingId, audio_duration: 0 });
    sendSuccess(res, 200, { message: "Meeting transcribed", data: result });
  };

  summarize: RequestHandler = async (req, res) => {
    const result = await meetingAIService.summarizeMeeting({ meeting_id: req.params.meetingId });
    sendSuccess(res, 200, { message: "Meeting summarized", data: result });
  };

  extractActions: RequestHandler = async (req, res) => {
    const result = await meetingAIService.extractActionItems({ meeting_id: req.params.meetingId });
    sendSuccess(res, 200, { message: "Action items extracted", data: result });
  };

  extractDecisions: RequestHandler = async (req, res) => {
    const result = await meetingAIService.extractDecisions({ meeting_id: req.params.meetingId });
    sendSuccess(res, 200, { message: "Decisions extracted", data: result });
  };

  generateReport: RequestHandler = async (req, res) => {
    const result = await meetingAIService.generateReport({ meeting_id: req.params.meetingId, report_type: "executive" });
    sendSuccess(res, 200, { message: "Report generated", data: result });
  };

  getAIData: RequestHandler = async (req, res) => {
    const result = await meetingAIService.getMeetingAIData(req.params.meetingId);
    sendSuccess(res, 200, { message: "Meeting AI data retrieved", data: result });
  };
}

export const meetingAIController = new MeetingAIController();