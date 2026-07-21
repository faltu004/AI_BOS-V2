from app.agents.base import BaseAgent
from app.models.chat import ChatMessage


class CEOAgent(BaseAgent):
    agent_id = "ceo"
    agent_name = "CEO Agent"
    description = "Company summary, revenue insights, business growth suggestions, risk analysis, and KPI summary."
    icon = "BriefcaseBusiness"
    color = "primary"
    capabilities = [
        "Company Summary",
        "Revenue Insights",
        "Business Growth Suggestions",
        "Risk Analysis",
        "KPI Summary",
    ]

    def system_prompt(self) -> str:
        return (
            "You are the CEO Agent for AI BOS. "
            "You provide executive-level insights including company summaries, "
            "revenue analysis, business growth strategies, risk assessments, and KPI summaries. "
            "Be concise, data-driven, and actionable. "
            "Always structure responses with clear headings and bullet points."
        )

    async def tools(self) -> dict[str, Any]:
        return {
            "get_company_summary": "Generate a high-level company summary",
            "analyze_revenue": "Analyze revenue trends and insights",
            "suggest_growth": "Provide business growth suggestions",
            "analyze_risks": "Identify and analyze business risks",
            "summarize_kpis": "Summarize key performance indicators",
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
