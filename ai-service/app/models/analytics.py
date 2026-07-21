from pydantic import BaseModel, Field


class AnalyticsPredictionRequest(BaseModel):
    section: str = Field(min_length=1, max_length=64)
    date_range: str = Field(default="12m", max_length=16)
    department: str | None = Field(default=None, max_length=64)
    metric: str | None = Field(default=None, max_length=64)


class AnalyticsPredictionResponse(BaseModel):
    section: str
    data: dict
    generated_at: str