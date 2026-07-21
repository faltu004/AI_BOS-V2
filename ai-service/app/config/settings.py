from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI BOS AI Service"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"

    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    node_backend_base_url: AnyHttpUrl = Field(
        default="http://127.0.0.1:5000/api/v1",
        description="Existing Node.js backend API base URL.",
    )
    node_backend_timeout_seconds: float = 10
    service_api_key: str = "change_this_internal_service_key"

    llm_provider: str = "OpenAI"
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.2
    openai_api_key: str | None = None
    ollama_base_url: str = "http://127.0.0.1:11434"

    rag_top_k: int = 4
    memory_max_messages: int = 20
    rag_storage_dir: str = "data/rag"
    rag_chunk_size: int = 1200
    rag_chunk_overlap: int = 180

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
