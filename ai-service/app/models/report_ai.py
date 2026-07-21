from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class ReportType(StrEnum):
    finance = "finance"
    projects = "projects"
    crm = "crm"
    employees = "employees"
    meetings = "meetings"
    customers = "customers"
    business_performance = "business_performance"


class ReportFormat(StrEnum):
    pdf = "pdf"
    excel = "excel"
    word = "word"
    email = "email"


class ReportSectionType(StrEnum):
    chart = "chart"
    table = "table"
    summary = "summary"
    insights = "insights"


class ReportSection(BaseModel):
    type: ReportSectionType
    title: str = Field(max_length=256)
    data: dict[str, Any] = Field(default_factory=dict)
    ai_insights: str | None = Field(default=None, max_length=4096)


class ReportRequest(BaseModel):
    report_type: ReportType
    format: ReportFormat
    date_range: str = Field(default="30d", max_length=32)
    sections: list[str] = Field(default_factory=list)
    recipients: list[str] | None = Field(default=None)
    schedule: str | None = Field(default=None, max_length=128)


class ReportResponse(BaseModel):
    id: str = Field(max_length=128)
    report_type: str = Field(max_length=64)
    format: str = Field(max_length=32)
    sections: list[ReportSection] = Field(default_factory=list)
    ai_summary: str = Field(max_length=8192)
    recommendations: list[str] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)
    download_url: str | None = Field(default=None, max_length=512)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ScheduledReport(BaseModel):
    id: str = Field(max_length=128)
    report_type: ReportType
    format: ReportFormat
    frequency: str = Field(max_length=32)  # daily, weekly, monthly
    recipients: list[str] = Field(default_factory=list)
    last_run: datetime | None = None
    next_run: datetime | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)