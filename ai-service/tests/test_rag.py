from fastapi.testclient import TestClient

from app.main import app


def test_rag_query_requires_authenticated_user() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/v1/rag/query",
        json={"query": "How does finance work?", "top_k": 2},
    )

    assert response.status_code == 401
    assert response.json()["success"] is False
