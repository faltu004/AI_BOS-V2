from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.middleware import request_context_middleware
from app.api.v1.router import api_router
from app.config import settings
from app.utils.logger import configure_logging

configure_logging()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.middleware("http")(request_context_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)


@app.get("/health")
async def health_check() -> dict[str, str | bool]:
    return {
        "success": True,
        "message": "AI BOS AI Service is healthy",
        "service": settings.app_name,
        "environment": settings.app_env,
    }


app.include_router(api_router, prefix=settings.api_prefix)
