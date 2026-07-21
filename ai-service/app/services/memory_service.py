import json
from datetime import datetime, timedelta
from typing import Any

from app.models.memory import MemoryCategory, MemoryItem, MemoryQuery, MemorySearchResult, MemoryType
from app.repositories.memory_repository import memory_repository
from app.utils.logger import get_logger
from app.utils.responses import ApiResponse, success_response

logger = get_logger(__name__)


class MemoryService:
    async def add_memory(
        self,
        user_id: str,
        memory_type: MemoryType,
        category: MemoryCategory,
        key: str,
        value: dict[str, Any],
        metadata: dict[str, Any] | None = None,
        ttl_hours: int | None = None,
    ) -> MemoryItem:
        item_id = f"mem_{user_id}_{memory_type.value}_{category.value}_{key}"
        expires_at = None
        if ttl_hours:
            expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)

        item = MemoryItem(
            id=item_id,
            user_id=user_id,
            type=memory_type,
            category=category,
            key=key,
            value=value,
            metadata=metadata or {},
            expires_at=expires_at,
        )
        return await memory_repository.create(item)

    async def get_memory(self, query: MemoryQuery) -> list[MemoryItem]:
        return await memory_repository.find(query)

    async def get_by_id(self, item_id: str, user_id: str) -> MemoryItem | None:
        return await memory_repository.get(item_id, user_id)

    async def update_memory(self, item_id: str, user_id: str, updates: dict[str, Any]) -> MemoryItem | None:
        return await memory_repository.update(item_id, user_id, updates)

    async def delete_memory(self, item_id: str, user_id: str) -> bool:
        return await memory_repository.delete(item_id, user_id)

    async def clear_memory(self, user_id: str, memory_type: MemoryType | None = None) -> int:
        type_value = memory_type.value if memory_type else None
        return await memory_repository.clear_all(user_id, type_value)

    async def search_memory(self, user_id: str, query: str, limit: int = 10) -> list[MemorySearchResult]:
        query_embedding = await self._generate_embedding(query)
        if not query_embedding:
            return []
        results = await memory_repository.search_semantic(user_id, query_embedding, limit)
        return [MemorySearchResult(item=item, score=score) for item, score in results]

    async def export_memory(self, user_id: str, types: list[MemoryType], format: str = "json") -> dict[str, Any]:
        all_items = []
        for memory_type in types:
            query = MemoryQuery(user_id=user_id, type=memory_type, limit=1000)
            items = await memory_repository.find(query)
            all_items.extend(items)
        export_data = {
            "user_id": user_id,
            "exported_at": datetime.utcnow().isoformat(),
            "format": format,
            "count": len(all_items),
            "items": [item.model_dump(mode="json") for item in all_items],
        }
        return export_data

    async def get_memory_stats(self, user_id: str) -> dict[str, Any]:
        stats: dict[str, Any] = {
            "total": 0,
            "by_type": {},
            "by_category": {},
        }
        for memory_type in MemoryType:
            query = MemoryQuery(user_id=user_id, type=memory_type, limit=1000)
            items = await memory_repository.find(query)
            stats["by_type"][memory_type.value] = len(items)
            stats["total"] += len(items)
            for item in items:
                cat = item.category.value
                stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1
        return stats

    async def _generate_embedding(self, text: str) -> list[float] | None:
        try:
            from app.embeddings.embedding_service import embedding_service
            embedding = await embedding_service.embed_query(text)
            return embedding
        except Exception:
            logger.warning("Embedding generation failed for memory search")
            return None


memory_service = MemoryService()