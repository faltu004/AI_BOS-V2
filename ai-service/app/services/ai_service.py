from collections.abc import AsyncIterator
from uuid import uuid4

from app.agents import BusinessAgent
from app.chains import ChatChain
from app.memory.conversation_memory import conversation_memory
from app.models.chat import ChatMessage, ChatRequest, ChatResponse, ChatRole
from app.rag.retriever import retriever
from app.services.backend_client import backend_client
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AIService:
    def __init__(self) -> None:
        self.agent = BusinessAgent(retriever=retriever)
        self.chat_chain = ChatChain()

    async def chat(self, request: ChatRequest, authorization: str | None = None) -> ChatResponse:
        conversation_id = request.conversation_id or str(uuid4())
        history = [*conversation_memory.get(conversation_id), *request.history]
        business_context, backend_sources = await self._load_business_context(authorization, request.include_business_context)
        attachment_context = self._format_attachments(request)
        combined_context = "\n\n".join(part for part in [business_context, attachment_context] if part)

        if combined_context:
            result = await self.chat_chain.ainvoke(request.message, history, combined_context)
            sources = backend_sources
        else:
            agent_result = await self.agent.run(request.message, history, request.module)
            result = agent_result["answer"]
            sources = agent_result["sources"]

        conversation_memory.add(
            conversation_id,
            [
                ChatMessage(role=ChatRole.user, content=request.message),
                ChatMessage(role=ChatRole.assistant, content=result),
            ],
        )

        return ChatResponse(
            conversation_id=conversation_id,
            message=result,
            sources=sources,
            metadata={"provider": "langchain", "orchestrator": "langgraph"},
        )

    async def stream_chat(
        self,
        request: ChatRequest,
        authorization: str | None = None,
    ) -> AsyncIterator[str]:
        conversation_id = request.conversation_id or str(uuid4())
        history = [*conversation_memory.get(conversation_id), *request.history]
        business_context, _backend_sources = await self._load_business_context(authorization, request.include_business_context)
        attachment_context = self._format_attachments(request)
        combined_context = "\n\n".join(part for part in [business_context, attachment_context] if part)
        chunks: list[str] = []

        async for chunk in self.chat_chain.astream(request.message, history, combined_context):
            chunks.append(chunk)
            yield chunk

        conversation_memory.add(
            conversation_id,
            [
                ChatMessage(role=ChatRole.user, content=request.message),
                ChatMessage(role=ChatRole.assistant, content="".join(chunks).strip()),
            ],
        )

    async def _load_business_context(self, authorization: str | None, enabled: bool) -> tuple[str, list[str]]:
        if not enabled or not authorization:
            return "", []
        try:
            return await backend_client.get_business_context(authorization)
        except Exception as exc:
            logger.warning("Unable to load backend business context: %s", exc)
            return "", []

    @staticmethod
    def _format_attachments(request: ChatRequest) -> str:
        if not request.attachments:
            return ""
        lines = ["User attachments:"]
        for attachment in request.attachments:
            lines.append(
                f"- {attachment.name} ({attachment.mime_type}, {attachment.size} bytes)"
            )
            if attachment.content:
                lines.append(f"  Content preview: {attachment.content[:8000]}")
        return "\n".join(lines)


ai_service = AIService()
