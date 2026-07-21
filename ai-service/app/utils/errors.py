from fastapi import HTTPException, status


class AppError(HTTPException):
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str = "APP_ERROR",
    ) -> None:
        super().__init__(status_code=status_code, detail={"message": message, "code": code})
        self.code = code
        self.message = message


class BackendServiceError(AppError):
    def __init__(self, message: str = "Node.js backend request failed") -> None:
        super().__init__(message=message, status_code=status.HTTP_502_BAD_GATEWAY, code="BACKEND_ERROR")
