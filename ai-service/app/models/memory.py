from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class MemoryType(StrEnum):
    conversation = "conversation"
    business = "business"
    preference = "preference"
    semantic = "semantic"


class MemoryCategory(StrEnum):
    recent_chat = "recent_chat"
    pinned_report = "pinned_report"
    recent_document = "recent_document"
    recent_project = "recent_project"
    favorite_page = "favorite_page"
    user_preference = "user_preference"
    business_context = "business_context"


class MemoryItem(BaseModel):
    id: str = Field(max_length=128)
    user_id: str = Field(max_length=128)
    type: MemoryType
    category: MemoryCategory
    key: str = Field(max_length=128)
    value: dict[str, Any]
    embedding: list[float] | None = Field(default=None, max_length=4096)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime | None = Field(default=None)


class MemoryQuery(BaseModel):
    user_id: str = Field(max_length=128)
    type: MemoryType | None = None
    category: MemoryCategory | None = None
    query: str | None = Field(default=None, max_length=500)
    limit: int = Field(default=10, ge=1, le=100)


class MemoryExport(BaseModel):
    user_id: str = Field(max_length=128)
    types: list[MemoryType] = Field(min_length=1)
    format: str = Field(default="json", max_length=16)


class MemorySearchResult(BaseModel):
    item: MemoryItem
    score: float = Field(ge=0.0, le=1.0)