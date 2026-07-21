from app.agents.base import BaseAgent
from app.models.chat import ChatMessage


class MarketingAgent(BaseAgent):
    agent_id = "marketing"
    agent_name = "Marketing Agent"
    description = "Campaign suggestions, SEO ideas, blog generation, and social media content ideas."
    icon = "Megaphone"
    color = "rose"
    capabilities = [
        "Campaign Suggestions",
        "SEO Ideas",
        "Blog Generation",
        "Social Media Ideas",
    ]

    def system_prompt(self) -> str:
        return (
            "You are the Marketing Agent for AI BOS. "
            "You create marketing campaigns, suggest SEO strategies, generate blog content, "
            "and provide social media ideas. "
            "Be creative, engaging, and brand-focused. "
            "Always structure responses with clear headings and bullet points."
        )

    async def tools(self) -> dict[str, Any]:
        return {
            "suggest_campaign": "Suggest marketing campaign ideas",
            "seo_ideas": "Provide SEO optimization ideas",
            "generate_blog": "Generate blog post ideas or content",
            "social_media_ideas": "Provide social media content ideas",
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
