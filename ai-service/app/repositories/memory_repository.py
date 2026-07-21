from typing import Any

from app.models.memory import MemoryItem, MemoryQuery


class MemoryRepository:
    def __init__(self) -> None:
        self._items: dict[str, MemoryItem] = {}

    async def create(self, item: MemoryItem) -> MemoryItem:
        self._items[item.id] = item
        return item

    async def find(self, query: MemoryQuery) -> list[MemoryItem]:
        results = []
        for item in self._items.values():
            if item.user_id != query.user_id:
                continue
            if query.type and item.type != query.type:
                continue
            if query.category and item.category != query.category:
                continue
            if query.query and item.embedding is None:
                continue
            results.append(item)
        results.sort(key=lambda x: x.updated_at, reverse=True)
        return results[: query.limit]

    async def get(self, item_id: str, user_id: str) -> MemoryItem | None:
        item = self._items.get(item_id)
        if item and item.user_id == user_id:
            return item
        return None

    async def update(self, item_id: str, user_id: str, updates: dict[str, Any]) -> MemoryItem | None:
        item = self._items.get(item_id)
        if not item or item.user_id != user_id:
            return None
        for key, value in updates.items():
            if hasattr(item, key):
                setattr(item, key, value)
        item.updated_at = __import__("datetime").datetime.utcnow()
        return item

    async def delete(self, item_id: str, user_id: str) -> bool:
        item = self._items.get(item_id)
        if not item or item.user_id != user_id:
            return False
        del self._items[item_id]
        return True

    async def clear_all(self, user_id: str, memory_type: str | None = None) -> int:
        to_delete = []
        for item_id, item in self._items.items():
            if item.user_id != user_id:
                continue
            if memory_type and item.type != memory_type:
                continue
            to_delete.append(item_id)
        for item_id in to_delete:
            del self._items[item_id]
        return len(to_delete)

    async def search_semantic(self, user_id: str, query_embedding: list[float], limit: int = 10) -> list[tuple[MemoryItem, float]]:
        results = []
        for item in self._items.values():
            if item.user_id != user_id or item.embedding is None:
                continue
            score = self._cosine_similarity(query_embedding, item.embedding)
            results.append((item, score))
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:limit]

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        if len(a) != len(b) or not a:
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)


memory_repository = MemoryRepository()