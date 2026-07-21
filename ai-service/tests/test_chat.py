from fastapi.testclient import TestClient

from app.main import app


def test_chat_requires_configured_provider() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/v1/chat",
        json={
            "message": "Summarize project priorities",
            "include_business_context": False,
        },
    )

    assert response.status_code in {502, 503}
    assert response.json()["success"] is False
