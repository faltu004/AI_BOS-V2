import httpx

from app.config import settings
from app.models.runtime import AIRuntimeConfig
from app.utils.errors import BackendServiceError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class BackendClient:
    def __init__(self) -> None:
        self.base_url = str(settings.node_backend_base_url).rstrip("/")
        self.timeout = settings.node_backend_timeout_seconds

    async def _request(self, method: str, path: str, token: str | None = None) -> dict:
        headers = {"x-ai-service-key": settings.service_api_key}
        if token:
            headers["Authorization"] = token if token.startswith("Bearer ") else f"Bearer {token}"

        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
                response = await client.request(method, path, headers=headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            raise BackendServiceError(str(exc)) from exc

    async def get_current_user(self, token: str) -> dict:
        return await self._request("GET", "/auth/me", token)

    async def get_projects(self, token: str) -> dict:
        return await self._request("GET", "/projects", token)

    async def get_project_stats(self, token: str) -> dict:
        return await self._request("GET", "/projects/stats", token)

    async def get_users(self, token: str) -> dict:
        return await self._request("GET", "/users", token)

    async def get_ai_runtime_config(self) -> AIRuntimeConfig:
        response = await self._request("GET", "/ai-config/runtime")
        data = response.get("data")
        if not data:
            raise BackendServiceError("AI runtime configuration is missing")
        return AIRuntimeConfig.model_validate(data)

    async def get_business_context(self, token: str) -> tuple[str, list[str]]:
        context_parts: list[str] = []
        sources: list[str] = []

        for label, path in [
            ("Current user", "/auth/me"),
            ("Projects", "/projects?limit=8"),
            ("Users", "/users"),
        ]:
            try:
                response = await self._request("GET", path, token)
                context_parts.append(f"{label}: {response.get('data', response)}")
                sources.append(f"node-backend://{path.lstrip('/')}")
            except Exception as exc:
                logger.warning("Unable to load backend context path=%s error=%s", path, exc)

        return "\n\n".join(context_parts), sources


backend_client = BackendClient()
