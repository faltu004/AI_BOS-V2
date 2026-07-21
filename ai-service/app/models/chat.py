from enum import StrEnum

from pydantic import BaseModel, Field


class ChatRole(StrEnum):
    system = "system"
    user = "user"
    assistant = "assistant"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str = Field(min_length=1, max_length=12000)


class ChatAttachment(BaseModel):
    name: str = Field(min_length=1, max_length=240)
    mime_type: str = Field(default="application/octet-stream", max_length=160)
    size: int = Field(default=0, ge=0)
    content: str | None = Field(default=None, max_length=40000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    conversation_id: str | None = Field(default=None, max_length=128)
    agent_id: str | None = Field(default="ceo", max_length=64)
    module: str | None = Field(default=None, max_length=64)
    history: list[ChatMessage] = Field(default_factory=list)
    attachments: list[ChatAttachment] = Field(default_factory=list)
    include_business_context: bool = True


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    agent_id: str | None = None
    sources: list[str] = Field(default_factory=list)
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)
