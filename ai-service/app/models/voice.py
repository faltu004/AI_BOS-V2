from pydantic import BaseModel, Field


class VoiceSttRequest(BaseModel):
    audio_base64: str | None = Field(default=None, max_length=50_000_000)


class VoiceSttResponse(BaseModel):
    text: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    duration: float = Field(default=0.0, ge=0.0)
    language: str = Field(default="en")


class VoiceTtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice: str | None = Field(default=None, max_length=64)


class VoiceProcessRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    session_id: str | None = Field(default=None, max_length=128)
    authorization: str | None = Field(default=None, max_length=512)