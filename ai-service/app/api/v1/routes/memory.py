from fastapi import APIRouter

from app.api.dependencies import get_authorization_header
from app.models.memory import MemoryExport, MemoryItem, MemoryQuery, MemorySearchResult
from app.services.memory_service import memory_service
from app.utils.responses import ApiResponse, success_response

router = APIRouter()


@router.get("", response_model=ApiResponse[list[MemoryItem]])
async def get_memory_items(
    user_id: str,
    type: str | None = None,
    category: str | None = None,
    limit: int = 10,
) -> ApiResponse[list[MemoryItem]]:
    query = MemoryQuery(user_id=user_id, type=type, category=category, limit=limit)
    items = await memory_service.get_memory(query)
    return success_response("Memory items retrieved", items)


@router.get("/{item_id}", response_model=ApiResponse[MemoryItem])
async def get_memory_item(item_id: str, authorization: str | None = None) -> ApiResponse[MemoryItem]:
    user_id = authorization or "anonymous"
    item = await memory_service.get_by_id(item_id, user_id)
    if not item:
        return success_response("Memory item not found", None)
    return success_response("Memory item retrieved", item)


@router.post("", response_model=ApiResponse[MemoryItem])
async def create_memory_item(item: MemoryItem, authorization: str | None = None) -> ApiResponse[MemoryItem]:
    user_id = authorization or "anonymous"
    item.user_id = user_id
    result = await memory_service.add_memory(
        user_id=user_id,
        memory_type=item.type,
        category=item.category,
        key=item.key,
        value=item.value,
        metadata=item.metadata,
    )
    return success_response("Memory item created", result)


@router.patch("/{item_id}", response_model=ApiResponse[MemoryItem])
async def update_memory_item(item_id: str, updates: dict, authorization: str | None = None) -> ApiResponse[MemoryItem]:
    user_id = authorization or "anonymous"
    result = await memory_service.update_memory(item_id, user_id, updates)
    if not result:
        return success_response("Memory item not found", None)
    return success_response("Memory item updated", result)


@router.delete("/{item_id}", response_model=ApiResponse[dict])
async def delete_memory_item(item_id: str, authorization: str | None = None) -> ApiResponse[dict]:
    user_id = authorization or "anonymous"
    deleted = await memory_service.delete_memory(item_id, user_id)
    return success_response("Memory item deleted" if deleted else "Memory item not found", {"deleted": deleted})


@router.delete("", response_model=ApiResponse[dict])
async def clear_user_memory(type: str | None = None, authorization: str | None = None) -> ApiResponse[dict]:
    user_id = authorization or "anonymous"
    memory_type = type if type else None
    deleted_count = await memory_service.clear_memory(user_id, memory_type)
    return success_response("Memory cleared", {"deleted_count": deleted_count})


@router.post("/export", response_model=ApiResponse[dict])
async def export_memory(payload: MemoryExport, authorization: str | None = None) -> ApiResponse[dict]:
    user_id = authorization or "anonymous"
    payload.user_id = user_id
    result = await memory_service.export_memory(payload.user_id, payload.types, payload.format)
    return success_response("Memory exported", result)


@router.post("/search", response_model=ApiResponse[list[MemorySearchResult]])
async def search_memory(user_id: str, query: str, limit: int = 10) -> ApiResponse[list[MemorySearchResult]]:
    results = await memory_service.search_memory(user_id, query, limit)
    return success_response("Memory search completed", results)


@router.get("/stats/{user_id}", response_model=ApiResponse[dict])
async def get_memory_stats(user_id: str, authorization: str | None = None) -> ApiResponse[dict]:
    stats = await memory_service.get_memory_stats(user_id)
    return success_response("Memory stats retrieved", stats)