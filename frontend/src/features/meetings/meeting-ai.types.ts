export type MeetingSegment = {
  speaker: string;
  text: string;
  timestamp: string;
  confidence: number;
};

export type MeetingTranscription = {
  id: string;
  meeting_id: string;
  segments: MeetingSegment[];
  full_text: string;
  duration: number;
  status: "processing" | "completed" | "failed";
};

export type MeetingSummary = {
  id: string;
  meeting_id: string;
  summary: string;
  key_points: string[];
  topics: string[];
  sentiment: "positive" | "neutral" | "negative";
};

export type ExtractedActionItem = {
  id: string;
  meeting_id: string;
  title: string;
  owner: string;
  due_date: string;
  priority: "high" | "medium" | "low";
  context: string;
};

export type MeetingDecision = {
  id: string;
  meeting_id: string;
  decision: string;
  rationale: string;
  stakeholders: string[];
  impact: "high" | "medium" | "low";
};

export type TimelineEventType = "topic" | "action" | "decision" | "milestone";

export type TimelineEvent = {
  timestamp: string;
  type: TimelineEventType;
  title: string;
  description: string;
};

export type MeetingReport = {
  id: string;
  meeting_id: string;
  report_type: "executive" | "detailed" | "action-items";
  content: {
    title: string;
    date: string;
    attendees: string[];
    summary: string;
    key_points: string[];
    decisions: Array<{ decision: string; rationale: string; impact: string }>;
    action_items: Array<{ title: string; owner: string; due_date: string; priority: string }>;
    next_steps: string[];
  };
  generated_at: string;
};

export type MeetingAIData = {
  meeting_id: string;
  transcription?: MeetingTranscription;
  summary?: MeetingSummary;
  action_items: ExtractedActionItem[];
  decisions: MeetingDecision[];
  timeline: TimelineEvent[];
  report?: MeetingReport;
};

export type MeetingRecordingStatus = "idle" | "recording" | "processing" | "completed" | "failed";