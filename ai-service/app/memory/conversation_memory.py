from collections import defaultdict, deque
from collections.abc import Iterable

from app.config import settings
from app.models.chat import ChatMessage


class ConversationMemory:
    def __init__(self, max_messages: int = settings.memory_max_messages) -> None:
        self._messages: dict[str, deque[ChatMessage]] = defaultdict(lambda: deque(maxlen=max_messages))

    def add(self, conversation_id: str, messages: Iterable[ChatMessage]) -> None:
        self._messages[conversation_id].extend(messages)

    def get(self, conversation_id: str) -> list[ChatMessage]:
        return list(self._messages[conversation_id])

    def clear(self, conversation_id: str) -> None:
        self._messages.pop(conversation_id, None)


conversation_memory = ConversationMemory()
