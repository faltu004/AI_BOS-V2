from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.chains import ChatChain
from app.models.chat import ChatMessage
from app.rag import InMemoryRetriever


class AgentState(TypedDict):
    message: str
    history: list[ChatMessage]
    module: str | None
    business_context: str
    answer: str
    sources: list[str]


class BusinessAgent:
    def __init__(
        self,
        chat_chain: ChatChain | None = None,
        retriever: InMemoryRetriever | None = None,
    ) -> None:
        self.chat_chain = chat_chain or ChatChain()
        self.retriever = retriever or InMemoryRetriever()
        self.graph = self._build_graph()

    def _build_graph(self):
        graph = StateGraph(AgentState)
        graph.add_node("retrieve_context", self._retrieve_context)
        graph.add_node("generate_answer", self._generate_answer)
        graph.set_entry_point("retrieve_context")
        graph.add_edge("retrieve_context", "generate_answer")
        graph.add_edge("generate_answer", END)
        return graph.compile()

    async def _retrieve_context(self, state: AgentState) -> AgentState:
        documents = self.retriever.search(
            query=state["message"],
            top_k=4,
            module=state["module"],
        )
        state["business_context"] = "\n".join(document.content for document in documents)
        state["sources"] = [document.source for document in documents]
        return state

    async def _generate_answer(self, state: AgentState) -> AgentState:
        state["answer"] = await self.chat_chain.ainvoke(
            message=state["message"],
            history=state["history"],
            business_context=state["business_context"],
        )
        return state

    async def run(self, message: str, history: list[ChatMessage], module: str | None) -> AgentState:
        initial_state: AgentState = {
            "message": message,
            "history": history,
            "module": module,
            "business_context": "",
            "answer": "",
            "sources": [],
        }
        return await self.graph.ainvoke(initial_state)
