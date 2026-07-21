from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Sequence
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import BaseMessage

from app.models.chat import ChatMessage
from app.services.llm_gateway import llm_gateway
from app.memory.conversation_memory import conversation_memory


class BaseAgent(ABC):
    agent_id: str = "base"
    agent_name: str = "Base Agent"
    description: str = "Base agent class"
    icon: str = "Bot"
    color: str = "primary"
    capabilities: list[str] = []

    def __init__(self) -> None:
        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.system_prompt()),
                ("system", "Conversation history:\n{history}"),
                ("system", "Shared memory context:\n{shared_memory}"),
                ("human", "{message}"),
            ]
        )

    @abstractmethod
    def system_prompt(self) -> str:
        pass

    @abstractmethod
    async def tools(self) -> dict[str, Any]:
        pass

    @abstractmethod
    async def process(self, message: str, history: list[ChatMessage], shared_memory: dict[str, Any]) -> str:
        pass

    async def astream(
        self,
        message: str,
        history: list[ChatMessage],
        shared_memory: dict[str, Any],
    ) -> AsyncIterator[str]:
        response = await self.process(message, history, shared_memory)
        for token in response.split(" "):
            yield f"{token} "

    def _format_history(self, history: list[ChatMessage]) -> str:
        return "\n".join(f"{item.role}: {item.content}" for item in history[-10:])

    def _format_shared_memory(self, shared_memory: dict[str, Any]) -> str:
        if not shared_memory:
            return "No shared context available."
        lines = []
        for key, value in shared_memory.items():
            lines.append(f"- {key}: {value}")
        return "\n".join(lines)
