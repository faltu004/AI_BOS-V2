from app.services.backend_client import BackendClient


class BackendTools:
    def __init__(self, backend_client: BackendClient) -> None:
        self.backend_client = backend_client

    async def get_current_user(self, token: str) -> dict:
        return await self.backend_client.get_current_user(token)

    async def get_projects(self, token: str) -> dict:
        return await self.backend_client.get_projects(token)
