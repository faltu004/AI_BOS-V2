from fastapi import APIRouter, Depends

from app.api.dependencies import get_authorization_header, require_service_key
from app.services.backend_client import backend_client
from app.utils.errors import AppError
from app.utils.responses import ApiResponse, success_response

router = APIRouter(dependencies=[Depends(require_service_key)])


@router.get("/me", response_model=ApiResponse[dict])
async def backend_me(
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[dict]:
    if not authorization:
        raise AppError("Authorization header is required", status_code=401, code="AUTH_REQUIRED")
    profile = await backend_client.get_current_user(authorization)
    return success_response("Backend profile loaded", profile)


@router.get("/projects", response_model=ApiResponse[dict])
async def backend_projects(
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[dict]:
    if not authorization:
        raise AppError("Authorization header is required", status_code=401, code="AUTH_REQUIRED")
    projects = await backend_client.get_projects(authorization)
    return success_response("Backend projects loaded", projects)
