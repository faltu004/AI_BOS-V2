from app.agents.base import BaseAgent
from app.agents.ceo_agent import CEOAgent
from app.agents.hr_agent import HRAgent
from app.agents.finance_agent import FinanceAgent
from app.agents.sales_agent import SalesAgent
from app.agents.marketing_agent import MarketingAgent
from app.agents.developer_agent import DeveloperAgent
from app.agents.support_agent import SupportAgent


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: dict[str, BaseAgent] = {}
        self._register_default_agents()

    def _register_default_agents(self) -> None:
        for agent_class in [
            CEOAgent,
            HRAgent,
            FinanceAgent,
            SalesAgent,
            MarketingAgent,
            DeveloperAgent,
            SupportAgent,
        ]:
            agent = agent_class()
            self._agents[agent.agent_id] = agent

    def get(self, agent_id: str) -> BaseAgent | None:
        return self._agents.get(agent_id)

    def list_agents(self) -> list[dict[str, str | list[str]]]:
        return [
            {
                "agent_id": agent.agent_id,
                "name": agent.agent_name,
                "description": agent.description,
                "icon": agent.icon,
                "color": agent.color,
                "capabilities": agent.capabilities,
            }
            for agent in self._agents.values()
        ]

    def register(self, agent: BaseAgent) -> None:
        self._agents[agent.agent_id] = agent


agent_registry = AgentRegistry()
