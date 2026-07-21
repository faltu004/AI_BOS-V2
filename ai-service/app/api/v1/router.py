from fastapi import APIRouter

from app.api.v1.routes import analytics, backend, business_intelligence, chat, meeting_ai, memory, multi_agent, rag, report_ai, voice, websocket

api_router = APIRouter()
api_router.include_router(chat.router, prefix="/chat", tags=["AI Chat"])
api_router.include_router(multi_agent.router, prefix="/multi-agent", tags=["Multi-Agent AI"])
api_router.include_router(
    business_intelligence.router,
    prefix="/business-intelligence",
    tags=["Business Intelligence"],
)
api_router.include_router(rag.router, prefix="/rag", tags=["RAG"])
api_router.include_router(backend.router, prefix="/backend", tags=["Backend Integration"])
api_router.include_router(voice.router, prefix="/voice", tags=["Voice AI"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics AI"])
api_router.include_router(memory.router, prefix="/memory", tags=["AI Memory"])
api_router.include_router(meeting_ai.router, prefix="/meeting-ai", tags=["Meeting AI"])
api_router.include_router(report_ai.router, prefix="/reports", tags=["AI Reports"])
api_router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
