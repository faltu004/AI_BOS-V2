from fastapi import Header

from app.config import settings
from app.utils.errors import AppError


async def require_service_key(x_ai_service_key: str | None = Header(default=None)) -> None:
    if settings.is_production and x_ai_service_key != settings.service_api_key:
        raise AppError("Invalid AI service key", status_code=401, code="INVALID_SERVICE_KEY")


async def get_authorization_header(authorization: str | None = Header(default=None)) -> str | None:
    return authorization
