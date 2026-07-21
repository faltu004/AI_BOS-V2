from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.models.chat import ChatRequest
from app.services.ai_service import ai_service

router = APIRouter()


@router.websocket("/chat")
async def websocket_chat(websocket: WebSocket) -> None:
    await websocket.accept()
    authorization = websocket.headers.get("authorization")

    try:
        while True:
            payload = await websocket.receive_json()
            request = ChatRequest.model_validate(payload)
            async for chunk in ai_service.stream_chat(request, authorization):
                await websocket.send_json({"type": "chunk", "data": chunk})
            await websocket.send_json({"type": "done", "data": "[DONE]"})
    except ValidationError as exc:
        await websocket.send_json({"type": "error", "message": "Validation failed", "errors": exc.errors()})
        await websocket.close(code=1003)
    except WebSocketDisconnect:
        return
