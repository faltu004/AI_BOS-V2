import math
from collections.abc import Sequence

import httpx
from fastapi import status

from app.config import settings
from app.models.runtime import AIRuntimeConfig
from app.services.backend_client import backend_client
from app.utils.errors import AppError

ChatProviderMessage = dict[str, str]


class LLMGateway:
    async def embed(self, text: str) -> dict[str, float]:
        runtime = await self._runtime_config()

        if runtime.provider == "OpenAI":
            return await self._openai_compatible_embedding(
                url="https://api.openai.com/v1/embeddings",
                runtime=runtime,
                text=text,
            )
        if runtime.provider == "Groq":
            return await self._openai_compatible_embedding(
                url="https://api.groq.com/openai/v1/embeddings",
                runtime=runtime,
                text=text,
            )
        if runtime.provider == "OpenRouter":
            return await self._openai_compatible_embedding(
                url="https://openrouter.ai/api/v1/embeddings",
                runtime=runtime,
                text=text,
                extra_headers={
                    "HTTP-Referer": "https://ai-bos.local",
                    "X-Title": "AI BOS",
                },
            )
        if runtime.provider == "Gemini":
            return await self._gemini_embedding(runtime, text)
        if runtime.provider == "Ollama":
            return await self._ollama_embedding(runtime, text)

        raise AppError(
            "Unsupported AI provider",
            status.HTTP_400_BAD_REQUEST,
            "UNSUPPORTED_PROVIDER",
        )

    async def complete(self, messages: Sequence[ChatProviderMessage]) -> str:
        runtime = await self._runtime_config()

        if runtime.provider == "OpenAI":
            return await self._openai_compatible(
                url="https://api.openai.com/v1/chat/completions",
                runtime=runtime,
                messages=messages,
            )
        if runtime.provider == "Groq":
            return await self._openai_compatible(
                url="https://api.groq.com/openai/v1/chat/completions",
                runtime=runtime,
                messages=messages,
            )
        if runtime.provider == "OpenRouter":
            return await self._openai_compatible(
                url="https://openrouter.ai/api/v1/chat/completions",
                runtime=runtime,
                messages=messages,
                extra_headers={
                    "HTTP-Referer": "https://ai-bos.local",
                    "X-Title": "AI BOS",
                },
            )
        if runtime.provider == "Gemini":
            return await self._gemini(runtime, messages)
        if runtime.provider == "Ollama":
            return await self._ollama(runtime, messages)

        raise AppError(
            "Unsupported AI provider",
            status.HTTP_400_BAD_REQUEST,
            "UNSUPPORTED_PROVIDER",
        )

    async def _runtime_config(self) -> AIRuntimeConfig:
        try:
            return await backend_client.get_ai_runtime_config()
        except Exception:
            if settings.llm_provider == "Ollama":
                return AIRuntimeConfig(
                    provider="Ollama",
                    apiKey="",
                    defaultModel=settings.llm_model,
                    embeddingModel="nomic-embed-text",
                    temperature=settings.llm_temperature,
                    maxTokens=4096,
                    contextWindow=128000,
                )
            if settings.openai_api_key:
                return AIRuntimeConfig(
                    provider="OpenAI",
                    apiKey=settings.openai_api_key,
                    defaultModel=settings.llm_model,
                    embeddingModel="text-embedding-3-small",
                    temperature=settings.llm_temperature,
                    maxTokens=4096,
                    contextWindow=128000,
                )
            raise AppError(
                (
                    "AI provider is not configured. Configure a provider and API key "
                    "in Admin > AI Configuration."
                ),
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "AI_PROVIDER_NOT_CONFIGURED",
            )

    async def _openai_compatible(
        self,
        url: str,
        runtime: AIRuntimeConfig,
        messages: Sequence[ChatProviderMessage],
        extra_headers: dict[str, str] | None = None,
    ) -> str:
        if not runtime.apiKey:
            raise AppError(
                f"{runtime.provider} API key is not configured.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "AI_API_KEY_MISSING",
            )

        headers = {"Authorization": f"Bearer {runtime.apiKey}", **(extra_headers or {})}
        payload = {
            "model": runtime.defaultModel,
            "messages": list(messages),
            "temperature": runtime.temperature,
            "max_tokens": runtime.maxTokens,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPError as exc:
                raise AppError(
                    f"{runtime.provider} request failed: {exc}",
                    status.HTTP_502_BAD_GATEWAY,
                    "AI_PROVIDER_REQUEST_FAILED",
                ) from exc

    async def _openai_compatible_embedding(
        self,
        url: str,
        runtime: AIRuntimeConfig,
        text: str,
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, float]:
        if not runtime.apiKey:
            raise AppError(
                f"{runtime.provider} API key is not configured.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "AI_API_KEY_MISSING",
            )

        headers = {"Authorization": f"Bearer {runtime.apiKey}", **(extra_headers or {})}
        payload = {"model": runtime.embeddingModel, "input": text}
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return self._normalize_embedding(data["data"][0]["embedding"])
            except httpx.HTTPError as exc:
                raise AppError(
                    f"{runtime.provider} embedding request failed: {exc}",
                    status.HTTP_502_BAD_GATEWAY,
                    "AI_EMBEDDING_REQUEST_FAILED",
                ) from exc

    async def _gemini(
        self,
        runtime: AIRuntimeConfig,
        messages: Sequence[ChatProviderMessage],
    ) -> str:
        if not runtime.apiKey:
            raise AppError(
                "Gemini API key is not configured.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "AI_API_KEY_MISSING",
            )

        prompt = "\n\n".join(f"{item['role'].upper()}: {item['content']}" for item in messages)
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{runtime.defaultModel}:generateContent"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": runtime.temperature,
                "maxOutputTokens": runtime.maxTokens,
            },
        }
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(url, params={"key": runtime.apiKey}, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except httpx.HTTPError as exc:
                raise AppError(
                    f"Gemini request failed: {exc}",
                    status.HTTP_502_BAD_GATEWAY,
                    "AI_PROVIDER_REQUEST_FAILED",
                ) from exc

    async def _gemini_embedding(self, runtime: AIRuntimeConfig, text: str) -> dict[str, float]:
        if not runtime.apiKey:
            raise AppError(
                "Gemini API key is not configured.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "AI_API_KEY_MISSING",
            )

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{runtime.embeddingModel}:embedContent"
        )
        payload = {"content": {"parts": [{"text": text}]}}
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(url, params={"key": runtime.apiKey}, json=payload)
                response.raise_for_status()
                data = response.json()
                return self._normalize_embedding(data["embedding"]["values"])
            except httpx.HTTPError as exc:
                raise AppError(
                    f"Gemini embedding request failed: {exc}",
                    status.HTTP_502_BAD_GATEWAY,
                    "AI_EMBEDDING_REQUEST_FAILED",
                ) from exc

    async def _ollama(
        self,
        runtime: AIRuntimeConfig,
        messages: Sequence[ChatProviderMessage],
    ) -> str:
        payload = {
            "model": runtime.defaultModel,
            "messages": list(messages),
            "stream": False,
            "options": {"temperature": runtime.temperature, "num_ctx": runtime.contextWindow},
        }
        async with httpx.AsyncClient(timeout=120) as client:
            try:
                response = await client.post(
                    f"{settings.ollama_base_url.rstrip('/')}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data["message"]["content"]
            except httpx.HTTPError as exc:
                raise AppError(
                    f"Ollama request failed: {exc}",
                    status.HTTP_502_BAD_GATEWAY,
                    "AI_PROVIDER_REQUEST_FAILED",
                ) from exc

    async def _ollama_embedding(self, runtime: AIRuntimeConfig, text: str) -> dict[str, float]:
        payload = {"model": runtime.embeddingModel, "prompt": text}
        async with httpx.AsyncClient(timeout=120) as client:
            try:
                response = await client.post(
                    f"{settings.ollama_base_url.rstrip('/')}/api/embeddings",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return self._normalize_embedding(data["embedding"])
            except httpx.HTTPError as exc:
                raise AppError(
                    f"Ollama embedding request failed: {exc}",
                    status.HTTP_502_BAD_GATEWAY,
                    "AI_EMBEDDING_REQUEST_FAILED",
                ) from exc

    @staticmethod
    def _normalize_embedding(values: Sequence[float]) -> dict[str, float]:
        norm = math.sqrt(sum(float(value) * float(value) for value in values)) or 1
        return {str(index): float(value) / norm for index, value in enumerate(values)}


llm_gateway = LLMGateway()
