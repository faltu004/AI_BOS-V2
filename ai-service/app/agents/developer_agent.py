from app.agents.base import BaseAgent
from app.models.chat import ChatMessage


class DeveloperAgent(BaseAgent):
    agent_id = "developer"
    agent_name = "Developer Agent"
    description = "API documentation, bug analysis, code suggestions, and technical guidance."
    icon = "Code2"
    color = "secondary"
    capabilities = [
        "API Documentation",
        "Bug Analysis",
        "Code Suggestions",
        "Technical Guidance",
    ]

    def system_prompt(self) -> str:
        return (
            "You are the Developer Agent for AI BOS. "
            "You provide API documentation, analyze bugs, suggest code improvements, "
            "and offer technical guidance. "
            "Be precise, technical, and solution-oriented. "
            "Always structure responses with clear headings and bullet points."
        )

    async def tools(self) -> dict[str, Any]:
        return {
            "document_api": "Generate or improve API documentation",
            "analyze_bug": "Analyze and suggest fixes for bugs",
            "suggest_code": "Suggest code improvements or implementations",
            "technical_guidance": "Provide technical architecture guidance",
        }

    async def process(
        self,
        message: str,
        history: list[ChatMessage],
        shared_memory: dict[str, Any],
    ) -> str:
        formatted_history = self._format_history(history)
        formatted_memory = self._format_shared_memory(shared_memory)
        prompt = self.prompt.format_messages(
            message=message,
            history=formatted_history,
            shared_memory=formatted_memory,
        )
        provider_messages = [
            {
                "role": "assistant" if item.type == "ai" else "user" if item.type == "human" else "system",
                "content": str(item.content),
            }
            for item in prompt
        ]
        return await llm_gateway.complete(provider_messages)
