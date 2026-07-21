from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str
    data: T | None = None


def success_response(message: str, data: T | None = None) -> ApiResponse[T]:
    return ApiResponse(message=message, data=data)
