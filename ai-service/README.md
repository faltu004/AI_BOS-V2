# AI BOS AI Service

FastAPI microservice for AI Business Operating System.

## Features

- Clean Architecture folder structure
- REST and WebSocket APIs
- Streaming AI responses
- LangChain and LangGraph-ready orchestration
- Pydantic request/response validation
- Secure REST client for the Node.js backend
- Environment-based configuration
- Structured logging and global error handling
- Docker deployment support

## Run Locally

```bash
cd ai-service
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API

- `GET /health`
- `POST /api/v1/chat`
- `POST /api/v1/chat/stream`
- `WebSocket /api/v1/ws/chat`
- `POST /api/v1/rag/query`
- `GET /api/v1/backend/me`

Protected backend calls forward the user's `Authorization: Bearer <jwt>` token to the existing Node.js API.
