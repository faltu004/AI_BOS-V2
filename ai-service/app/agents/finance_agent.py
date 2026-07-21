from app.agents.base import BaseAgent
from app.models.chat import ChatMessage


class FinanceAgent(BaseAgent):
    agent_id = "finance"
    agent_name = "Finance Agent"
    description = "Revenue analysis, expense tracking, cash flow management, invoice insights, and financial reports."
    icon = "CircleDollarSign"
    color = "warning"
    capabilities = [
        "Revenue Analysis",
        "Expense Analysis",
        "Cash Flow",
        "Invoice Insights",
        "Financial Reports",
    ]

    def system_prompt(self) -> str:
        return (
            "You are the Finance Agent for AI BOS. "
            "You provide financial analysis including revenue trends, expense tracking, "
            "cash flow management, invoice insights, and financial reporting. "
            "Be precise, compliant, and data-driven. "
            "Always structure responses with clear headings and bullet points."
        )

    async def tools(self) -> dict[str, Any]:
        return {
            "analyze_revenue": "Analyze revenue trends and projections",
            "analyze_expenses": "Analyze expense patterns and anomalies",
            "analyze_cashflow": "Analyze cash flow and liquidity",
            "insight_invoices": "Provide invoice status insights",
            "generate_report": "Generate financial summary reports",
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
