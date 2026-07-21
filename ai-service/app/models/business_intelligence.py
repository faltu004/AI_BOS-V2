from typing import Any, Literal

from pydantic import BaseModel, Field


ChartType = Literal["line", "bar", "area", "pie"]
InsightSeverity = Literal["success", "warning", "danger", "info"]


class BIChartSeries(BaseModel):
    name: str
    data_key: str
    color: str = "primary"


class BIChart(BaseModel):
    id: str
    title: str
    type: ChartType
    x_key: str = "label"
    data: list[dict[str, Any]] = Field(default_factory=list)
    series: list[BIChartSeries] = Field(default_factory=list)


class BIMetric(BaseModel):
    label: str
    value: str
    change: str | None = None
    tone: InsightSeverity = "info"
    source: str | None = None


class BIInsight(BaseModel):
    title: str
    detail: str
    severity: InsightSeverity = "info"


class BISource(BaseModel):
    module: str
    label: str
    record_count: int = 0


class BIQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    client_context: dict[str, Any] = Field(default_factory=dict)
    include_backend_context: bool = True


class BIQueryResponse(BaseModel):
    answer: str
    intent: str
    metrics: list[BIMetric] = Field(default_factory=list)
    insights: list[BIInsight] = Field(default_factory=list)
    charts: list[BIChart] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    sources: list[BISource] = Field(default_factory=list)
    generated_at: str
