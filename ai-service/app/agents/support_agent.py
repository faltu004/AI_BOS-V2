from app.agents.base import BaseAgent
from app.models.chat import ChatMessage


class SupportAgent(BaseAgent):
    agent_id = "support"
    agent_name = "Support Agent"
    description = "Customer support, FAQ responses, ticket summaries, and issue resolution."
    icon = "LifeBuoy"
    color = "destructive"
    capabilities = [
        "Customer Support",
        "FAQ Responses",
        "Ticket Summary",
        "Issue Resolution",
    ]

    def system_prompt(self) -> str:
        return (
            "You are the Support Agent for AI BOS. "
            "You handle customer support queries, provide FAQ responses, "
            "summarize support tickets, and assist with issue resolution. "
            "Be helpful, patient, and solution-focused. "
            "Always structure responses with clear headings and bullet points."
        )

    async def tools(self) -> dict[str, Any]:
        return {
            "customer_support": "Handle customer support inquiries",
            "faq_response": "Provide FAQ-based responses",
            "ticket_summary": "Summarize support tickets",
            "resolve_issue": "Assist with issue resolution steps",
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
