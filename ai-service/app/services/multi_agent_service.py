from collections.abc import AsyncIterator
from uuid import uuid4

from langgraph.graph import END, StateGraph

from app.agents import agent_registry
from app.models.chat import ChatMessage, ChatRole
from app.memory.conversation_memory import conversation_memory
from app.services.backend_client import backend_client
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MultiAgentState(dict):
    message: str
    agent_id: str | None
    history: list[ChatMessage]
    shared_memory: dict[str, object]
    response: str
    sources: list[str]
    error: str | None


class MultiAgentOrchestrator:
    def __init__(self) -> None:
        self.graph = self._build_graph()

    def _build_graph(self):
        graph = StateGraph(MultiAgentState)
        graph.add_node("route", self._route)
        graph.add_node("execute", self._execute_agent)
        graph.add_node("finalize", self._finalize)
        graph.set_entry_point("route")
        graph.add_edge("route", "execute")
        graph.add_edge("execute", "finalize")
        graph.add_edge("finalize", END)
        return graph.compile()

    async def _route(self, state: MultiAgentState) -> MultiAgentState:
        agent_id = state.get("agent_id")
        if not agent_id:
            state["agent_id"] = "ceo"
        agent = agent_registry.get(state["agent_id"])
        if not agent:
            state["error"] = f"Agent '{state['agent_id']}' not found"
        return state

    async def _execute_agent(self, state: MultiAgentState) -> MultiAgentState:
        if state.get("error"):
            return state
        agent_id = state["agent_id"]
        agent = agent_registry.get(agent_id)
        if not agent:
            state["error"] = f"Agent '{agent_id}' not found"
            return state
        try:
            response = ""
            async for chunk in agent.astream(
                message=state["message"],
                history=state["history"],
                shared_memory=state["shared_memory"],
            ):
                response += chunk
            state["response"] = response.strip()
        except Exception as exc:
            logger.error("Agent '%s' failed: %s", agent_id, exc)
            state["error"] = str(exc)
        return state

    async def _finalize(self, state: MultiAgentState) -> MultiAgentState:
        if not state.get("response") and not state.get("error"):
            state["response"] = "I was unable to generate a response. Please try again."
        return state

    async def invoke(
        self,
        message: str,
        agent_id: str,
        conversation_id: str,
        authorization: str | None = None,
    ) -> dict[str, object]:
        history = conversation_memory.get(conversation_id)
        shared_memory = await self._load_shared_memory(authorization)

        initial_state: MultiAgentState = {
            "message": message,
            "agent_id": agent_id,
            "history": history,
            "shared_memory": shared_memory,
            "response": "",
            "sources": [],
            "error": None,
        }

        result = await self.graph.ainvoke(initial_state)

        response_text = result.get("response", "")
        conversation_memory.add(
            conversation_id,
            [
                ChatMessage(role=ChatRole.user, content=message),
                ChatMessage(role=ChatRole.assistant, content=response_text),
            ],
        )

        return {
            "conversation_id": conversation_id,
            "message": response_text,
            "agent_id": agent_id,
            "sources": result.get("sources", []),
            "error": result.get("error"),
        }

    async def astream(
        self,
        message: str,
        agent_id: str,
        conversation_id: str,
        authorization: str | None = None,
    ) -> AsyncIterator[str]:
        history = conversation_memory.get(conversation_id)
        shared_memory = await self._load_shared_memory(authorization)

        agent = agent_registry.get(agent_id)
        if not agent:
            yield f"data: Agent '{agent_id}' not found\n\n"
            yield "event: done\ndata: [DONE]\n\n"
            return

        full_response = ""
        async for chunk in agent.astream(
            message=message,
            history=history,
            shared_memory=shared_memory,
        ):
            full_response += chunk
            yield f"data: {chunk}\n\n"

        conversation_memory.add(
            conversation_id,
            [
                ChatMessage(role=ChatRole.user, content=message),
                ChatMessage(role=ChatRole.assistant, content=full_response.strip()),
            ],
        )

        yield "event: done\ndata: [DONE]\n\n"

    async def _load_shared_memory(self, authorization: str | None) -> dict[str, object]:
        memory: dict[str, object] = {}
        if not authorization:
            return memory
        try:
            context, _ = await backend_client.get_business_context(authorization)
            memory["business_context"] = context
        except Exception as exc:
            logger.warning("Shared memory load failed: %s", exc)
        return memory


multi_agent_orchestrator = MultiAgentOrchestrator()
