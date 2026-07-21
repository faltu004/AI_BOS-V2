from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_authorization_header
from app.agents import agent_registry
from app.models.chat import ChatRequest, ChatResponse
from app.services.multi_agent_service import multi_agent_orchestrator
from app.utils.responses import ApiResponse, success_response

router = APIRouter()


@router.get("/agents")
async def list_agents() -> ApiResponse[list[dict[str, str | list[str]]]]:
    agents = agent_registry.list_agents()
    return success_response("Agents retrieved", agents)


@router.post("", response_model=ApiResponse[ChatResponse])
async def multi_agent_chat(
    payload: ChatRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[ChatResponse]:
    result = await multi_agent_orchestrator.invoke(
        message=payload.message,
        agent_id=payload.agent_id or "ceo",
        conversation_id=payload.conversation_id or str(__import__("uuid").uuid4()),
        authorization=authorization,
    )
    response = ChatResponse(
        conversation_id=result["conversation_id"],
        message=result["message"],
        agent_id=result.get("agent_id"),
        sources=result.get("sources", []),
        metadata={"orchestrator": "langgraph-multi-agent"},
    )
    return success_response("Multi-agent response generated", response)


@router.post("/stream")
async def stream_multi_agent_chat(
    payload: ChatRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> StreamingResponse:
    conversation_id = payload.conversation_id or str(__import__("uuid").uuid4())

    async def event_stream():
        async for chunk in multi_agent_orchestrator.astream(
            message=payload.message,
            agent_id=payload.agent_id or "ceo",
            conversation_id=conversation_id,
            authorization=authorization,
        ):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/event-stream")
