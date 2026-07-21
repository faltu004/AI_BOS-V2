from app.agents.base import BaseAgent
from app.models.chat import ChatMessage


class SalesAgent(BaseAgent):
    agent_id = "sales"
    agent_name = "Sales Agent"
    description = "CRM analysis, lead scoring, sales predictions, and customer insights."
    icon = "TrendingUp"
    color = "info"
    capabilities = [
        "CRM Analysis",
        "Lead Scoring",
        "Sales Prediction",
        "Customer Insights",
    ]

    def system_prompt(self) -> str:
        return (
            "You are the Sales Agent for AI BOS. "
            "You analyze CRM data, score leads, predict sales trends, "
            "and provide customer insights. "
            "Be persuasive, analytical, and focused on revenue growth. "
            "Always structure responses with clear headings and bullet points."
        )

    async def tools(self) -> dict[str, Any]:
        return {
            "analyze_crm": "Analyze CRM pipeline and customer data",
            "score_leads": "Score and prioritize leads",
            "predict_sales": "Predict sales trends and outcomes",
            "customer_insights": "Provide customer behavior insights",
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
