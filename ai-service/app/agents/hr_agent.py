from app.agents.base import BaseAgent
from app.models.chat import ChatMessage


class HRAgent(BaseAgent):
    agent_id = "hr"
    agent_name = "HR Agent"
    description = "Employee performance analysis, attendance insights, leave suggestions, and hiring recommendations."
    icon = "UsersRound"
    color = "success"
    capabilities = [
        "Employee Performance",
        "Attendance Analysis",
        "Leave Suggestions",
        "Hiring Recommendations",
    ]

    def system_prompt(self) -> str:
        return (
            "You are the HR Agent for AI BOS. "
            "You analyze employee performance, attendance patterns, leave management, "
            "and provide hiring recommendations. "
            "Be empathetic, data-informed, and focused on people operations. "
            "Always structure responses with clear headings and bullet points."
        )

    async def tools(self) -> dict[str, Any]:
        return {
            "analyze_performance": "Analyze employee performance metrics",
            "analyze_attendance": "Analyze attendance patterns and trends",
            "suggest_leave": "Suggest optimal leave planning",
            "recommend_hiring": "Provide hiring recommendations based on workload",
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
