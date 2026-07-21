from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class MeetingSegment(BaseModel):
    speaker: str = Field(max_length=128)
    text: str = Field(max_length=4096)
    timestamp: str = Field(max_length=32)
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)


class MeetingTranscription(BaseModel):
    id: str = Field(max_length=128)
    meeting_id: str = Field(max_length=128)
    segments: list[MeetingSegment] = Field(default_factory=list)
    full_text: str = Field(default="", max_length=65536)
    duration: int = Field(ge=0, default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingSummary(BaseModel):
    id: str = Field(max_length=128)
    meeting_id: str = Field(max_length=128)
    summary: str = Field(max_length=8192)
    key_points: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    sentiment: str = Field(max_length=32, default="neutral")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExtractedActionItem(BaseModel):
    id: str = Field(max_length=128)
    meeting_id: str = Field(max_length=128)
    title: str = Field(max_length=512)
    owner: str = Field(max_length=128)
    due_date: str = Field(max_length=32)
    priority: str = Field(max_length=32, default="medium")
    context: str = Field(max_length=1024, default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingDecision(BaseModel):
    id: str = Field(max_length=128)
    meeting_id: str = Field(max_length=128)
    decision: str = Field(max_length=2048)
    rationale: str = Field(max_length=4096, default="")
    stakeholders: list[str] = Field(default_factory=list)
    impact: str = Field(max_length=128, default="medium")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TimelineEventType(StrEnum):
    topic = "topic"
    action = "action"
    decision = "decision"
    milestone = "milestone"


class TimelineEvent(BaseModel):
    timestamp: str = Field(max_length=32)
    type: TimelineEventType
    title: str = Field(max_length=256)
    description: str = Field(max_length=1024, default="")


class MeetingReport(BaseModel):
    id: str = Field(max_length=128)
    meeting_id: str = Field(max_length=128)
    report_type: str = Field(max_length=64)
    content: dict[str, Any] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingAIData(BaseModel):
    meeting_id: str = Field(max_length=128)
    transcription: MeetingTranscription | None = None
    summary: MeetingSummary | None = None
    action_items: list[ExtractedActionItem] = Field(default_factory=list)
    decisions: list[MeetingDecision] = Field(default_factory=list)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    report: MeetingReport | None = None