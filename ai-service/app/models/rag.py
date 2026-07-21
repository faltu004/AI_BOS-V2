from typing import Literal

from pydantic import BaseModel, Field


class RagDocument(BaseModel):
    id: str
    document_id: str | None = None
    chunk_id: str | None = None
    title: str
    content: str
    source: str
    score: float = 0
    reference: str | None = None


class KnowledgePermissions(BaseModel):
    visibility: Literal["private", "workspace", "restricted"] = "workspace"
    allowed_roles: list[str] = Field(default_factory=list)
    allowed_user_ids: list[str] = Field(default_factory=list)


class KnowledgeFile(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    status: Literal["Processing", "Ready", "Failed"] = "Ready"
    owner_id: str
    owner_role: str
    chunk_count: int = 0
    permissions: KnowledgePermissions = Field(default_factory=KnowledgePermissions)
    created_at: str
    updated_at: str
    error: str | None = None


class KnowledgeChunk(BaseModel):
    id: str
    document_id: str
    filename: str
    content: str
    source: str
    reference: str
    embedding: dict[str, float]
    permissions: KnowledgePermissions
    owner_id: str
    owner_role: str


class RagQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    module: str | None = Field(default=None, max_length=64)
    top_k: int = Field(default=4, ge=1, le=20)
    document_ids: list[str] = Field(default_factory=list)


class RagQueryResponse(BaseModel):
    answer: str = ""
    documents: list[RagDocument]


class RagAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    mode: Literal["answer", "summarize", "explain"] = "answer"
    top_k: int = Field(default=6, ge=1, le=20)
    document_ids: list[str] = Field(default_factory=list)


class RagAskResponse(BaseModel):
    answer: str
    sources: list[RagDocument]
