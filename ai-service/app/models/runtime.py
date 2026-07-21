from typing import Literal

from pydantic import BaseModel

AIProvider = Literal["OpenAI", "Gemini", "Ollama", "Groq", "OpenRouter"]


class RuntimeFeatures(BaseModel):
    streaming: bool = True
    memory: bool = True
    rag: bool = True
    ocr: bool = False
    voice: bool = False


class AIRuntimeConfig(BaseModel):
    provider: AIProvider
    apiKey: str = ""
    defaultModel: str
    embeddingModel: str
    temperature: float = 0.2
    maxTokens: int = 4096
    contextWindow: int = 128000
    features: RuntimeFeatures = RuntimeFeatures()
