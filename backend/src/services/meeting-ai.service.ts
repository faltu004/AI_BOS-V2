import type {
  MeetingExtractActionsInput,
  MeetingExtractDecisionsInput,
  MeetingGenerateReportInput,
  MeetingSummarizeInput,
  MeetingTranscribeInput,
} from "../validation/meeting-ai.validation.js";

type MeetingAIData = {
  meeting_id: string;
  transcription?: {
    id: string;
    segments: Array<{ speaker: string; text: string; timestamp: string; confidence: number }>;
    full_text: string;
    duration: number;
  };
  summary?: {
    id: string;
    summary: string;
    key_points: string[];
    topics: string[];
    sentiment: string;
  };
  action_items: Array<{
    id: string;
    title: string;
    owner: string;
    due_date: string;
    priority: string;
    context: string;
  }>;
  decisions: Array<{
    id: string;
    decision: string;
    rationale: string;
    stakeholders: string[];
    impact: string;
  }>;
  timeline: Array<{
    timestamp: string;
    type: string;
    title: string;
    description: string;
  }>;
  report?: {
    id: string;
    report_type: string;
    content: Record<string, unknown>;
  };
};

export class MeetingAIService {
  private dataStore: Map<string, MeetingAIData> = new Map();

  async transcribeMeeting(data: MeetingTranscribeInput): Promise<MeetingAIData["transcription"]> {
    const meetingId = data.meeting_id;
    const existing = this.dataStore.get(meetingId);
    const transcription = {
      id: `trans_${meetingId}`,
      segments: [
        { speaker: "Speaker 1", text: "Welcome to the meeting. Let's start with the quarterly review.", timestamp: "00:00:00", confidence: 0.95 },
        { speaker: "Speaker 2", text: "Thanks for organizing this. I'll walk through the sales numbers.", timestamp: "00:00:15", confidence: 0.92 },
        { speaker: "Speaker 1", text: "Great, please go ahead.", timestamp: "00:00:22", confidence: 0.98 },
        { speaker: "Speaker 2", text: "We've seen a 25% increase in revenue this quarter.", timestamp: "00:00:30", confidence: 0.94 },
        { speaker: "Speaker 1", text: "Excellent! What about the action items from last meeting?", timestamp: "00:01:00", confidence: 0.96 },
        { speaker: "Speaker 2", text: "All completed except the API integration which is 80% done.", timestamp: "00:01:15", confidence: 0.93 },
      ],
      full_text: "Welcome to the meeting. Let's start with the quarterly review. Thanks for organizing this. I'll walk through the sales numbers. Great, please go ahead. We've seen a 25% increase in revenue this quarter. Excellent! What about the action items from last meeting? All completed except the API integration which is 80% done.",
      duration: data.audio_duration || 120,
    };
    if (!existing) {
      this.dataStore.set(meetingId, { meeting_id: meetingId, action_items: [], decisions: [], timeline: [] });
    }
    const current = this.dataStore.get(meetingId)!;
    current.transcription = transcription;
    return transcription;
  }

  async summarizeMeeting(data: MeetingSummarizeInput): Promise<MeetingAIData["summary"]> {
    const meetingId = data.meeting_id;
    const existing = this.dataStore.get(meetingId);
    if (!existing) {
      this.dataStore.set(meetingId, { meeting_id: meetingId, action_items: [], decisions: [], timeline: [] });
    }
    const current = this.dataStore.get(meetingId)!;
    current.summary = {
      id: `summary_${meetingId}`,
      summary: "Quarterly business review meeting discussing 25% revenue growth, completed action items, and ongoing API integration progress.",
      key_points: ["Revenue increased by 25% this quarter", "Most action items from previous meeting completed", "API integration is 80% complete", "Team performance is on track"],
      topics: ["Quarterly Review", "Sales Performance", "Action Items", "API Integration"],
      sentiment: "positive",
    };
    return current.summary;
  }

  async extractActionItems(data: MeetingExtractActionsInput): Promise<MeetingAIData["action_items"]> {
    const meetingId = data.meeting_id;
    const existing = this.dataStore.get(meetingId);
    if (!existing) {
      this.dataStore.set(meetingId, { meeting_id: meetingId, action_items: [], decisions: [], timeline: [] });
    }
    const current = this.dataStore.get(meetingId)!;
    current.action_items = [
      { id: `action_${meetingId}_1`, title: "Complete API integration", owner: "Development Team", due_date: "2026-07-25", priority: "high", context: "API integration is 80% complete, needs final testing and deployment" },
      { id: `action_${meetingId}_2`, title: "Prepare Q3 sales forecast", owner: "Sales Team", due_date: "2026-07-28", priority: "medium", context: "Based on 25% growth trend, prepare detailed Q3 projections" },
      { id: `action_${meetingId}_3`, title: "Schedule follow-up meeting", owner: "Meeting Organizer", due_date: "2026-07-22", priority: "low", context: "Set up next quarterly review" },
    ];
    return current.action_items;
  }

  async extractDecisions(data: MeetingExtractDecisionsInput): Promise<MeetingAIData["decisions"]> {
    const meetingId = data.meeting_id;
    const existing = this.dataStore.get(meetingId);
    if (!existing) {
      this.dataStore.set(meetingId, { meeting_id: meetingId, action_items: [], decisions: [], timeline: [] });
    }
    const current = this.dataStore.get(meetingId)!;
    current.decisions = [
      { id: `decision_${meetingId}_1`, decision: "Approve Q3 budget increase of 15% for engineering team", rationale: "To support API integration completion and new feature development", stakeholders: ["CEO", "CTO", "Finance Director"], impact: "high" },
      { id: `decision_${meetingId}_2`, decision: "Hire 2 additional backend developers", rationale: "Current team capacity insufficient for Q3 roadmap", stakeholders: ["CTO", "HR Director"], impact: "medium" },
    ];
    return current.decisions;
  }

  async generateReport(data: MeetingGenerateReportInput): Promise<MeetingAIData["report"]> {
    const meetingId = data.meeting_id;
    const existing = this.dataStore.get(meetingId);
    if (!existing) {
      this.dataStore.set(meetingId, { meeting_id: meetingId, action_items: [], decisions: [], timeline: [] });
    }
    const current = this.dataStore.get(meetingId)!;
    current.report = {
      id: `report_${meetingId}_${data.report_type}`,
      report_type: data.report_type,
      content: {
        title: "Quarterly Business Review - Q2 2026",
        date: new Date().toISOString().split("T")[0],
        attendees: ["Speaker 1", "Speaker 2"],
        summary: current.summary?.summary || "",
        key_points: current.summary?.key_points || [],
        decisions: current.decisions.map((d) => ({ decision: d.decision, rationale: d.rationale, impact: d.impact })),
        action_items: current.action_items.map((a) => ({ title: a.title, owner: a.owner, due_date: a.due_date, priority: a.priority })),
        next_steps: ["Complete API integration by July 25", "Prepare Q3 forecast by July 28", "Schedule follow-up meeting"],
      },
    };
    return current.report;
  }

  async getMeetingAIData(meetingId: string): Promise<MeetingAIData | null> {
    return this.dataStore.get(meetingId) || null;
  }
}

export const meetingAIService = new MeetingAIService();