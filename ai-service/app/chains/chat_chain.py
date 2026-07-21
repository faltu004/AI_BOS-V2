from collections.abc import AsyncIterator

from langchain_core.prompts import ChatPromptTemplate

from app.models.chat import ChatMessage
from app.prompts import AI_BOS_SYSTEM_PROMPT
from app.services.llm_gateway import llm_gateway


class ChatChain:
    """LangChain-compatible chat chain with a production provider seam."""

    def __init__(self) -> None:
        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", AI_BOS_SYSTEM_PROMPT),
                ("system", "Business context:\n{business_context}"),
                ("system", "Conversation history:\n{history}"),
                ("human", "{message}"),
            ],
        )

    async def ainvoke(
        self,
        message: str,
        history: list[ChatMessage],
        business_context: str,
    ) -> str:
        formatted_messages = self.prompt.format_messages(
            business_context=business_context,
            history=self._format_history(history),
            message=message,
        )
        provider_messages = [
            {
                "role": "assistant" if item.type == "ai" else "user" if item.type == "human" else "system",
                "content": str(item.content),
            }
            for item in formatted_messages
        ]
        return await llm_gateway.complete(provider_messages)

    async def astream(
        self,
        message: str,
        history: list[ChatMessage],
        business_context: str,
    ) -> AsyncIterator[str]:
        response = await self.ainvoke(message, history, business_context)
        for token in response.split(" "):
            yield f"{token} "

    @staticmethod
    def _format_history(history: list[ChatMessage]) -> str:
        return "\n".join(f"{item.role}: {item.content}" for item in history[-10:])
