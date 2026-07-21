import { z } from "zod";

export const meetingTranscribeSchema = z.object({
  meeting_id: z.string().min(1, "Meeting ID is required"),
  audio_duration: z.coerce.number().int().nonnegative().default(0),
});

export const meetingSummarizeSchema = z.object({
  meeting_id: z.string().min(1, "Meeting ID is required"),
});

export const meetingExtractActionsSchema = z.object({
  meeting_id: z.string().min(1, "Meeting ID is required"),
});

export const meetingExtractDecisionsSchema = z.object({
  meeting_id: z.string().min(1, "Meeting ID is required"),
});

export const meetingGenerateReportSchema = z.object({
  meeting_id: z.string().min(1, "Meeting ID is required"),
  report_type: z.enum(["executive", "detailed", "action-items"]).default("executive"),
});

export type MeetingTranscribeInput = z.infer<typeof meetingTranscribeSchema>;
export type MeetingSummarizeInput = z.infer<typeof meetingSummarizeSchema>;
export type MeetingExtractActionsInput = z.infer<typeof meetingExtractActionsSchema>;
export type MeetingExtractDecisionsInput = z.infer<typeof meetingExtractDecisionsSchema>;
export type MeetingGenerateReportInput = z.infer<typeof meetingGenerateReportSchema>;