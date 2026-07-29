# API Documentation

## Backend API

Base URL:

```text
http://127.0.0.1:5000/api/v1
```

Health:

```http
GET /health
```

Response:

```json
{
  "success": true,
  "message": "AI BOS API is healthy",
  "service": "AI Business Operating System API"
}
```

Authentication:

```http
Authorization: Bearer <access-token>
```

Responses follow:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {}
}
```

Errors include `success: false`, `message`, and `requestId`.

## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register user. Server pins public role to Employee. |
| POST | `/auth/login` | Public | Login and receive token pair. |
| POST | `/auth/refresh-token` | Public/body token or CSRF header for cookie token | Refresh token pair. |
| POST | `/auth/logout` | Public | Clear refresh-token cookie. |
| GET | `/auth/me` | User | Current profile. |
| PATCH | `/auth/change-password` | User | Change own password. |

## Users

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/users` | Admin, CEO | List users. |

## Projects

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/projects` | Authenticated | Paginated project list. |
| GET | `/projects/stats` | Admin, CEO, Manager, HR | Project statistics. |
| GET | `/projects/export/csv` | Admin, CEO, Manager | CSV export. |
| GET | `/projects/export/pdf` | Admin, CEO, Manager | PDF export. |
| POST | `/projects` | Admin, CEO, Manager | Create project. |
| GET | `/projects/:id` | Authenticated | Project details. |
| PATCH | `/projects/:id` | Admin, CEO, Manager | Update project. |
| DELETE | `/projects/:id` | Admin, CEO | Delete project. |
| PATCH | `/projects/:id/archive` | Admin, CEO, Manager | Archive project. |
| POST | `/projects/:id/duplicate` | Admin, CEO, Manager | Duplicate project. |
| PATCH | `/projects/bulk` | Admin, CEO, Manager | Bulk update. |
| DELETE | `/projects/bulk` | Admin, CEO, Manager | Bulk delete. |

List query parameters:

- `page`, `limit`, `search`, `status`, `priority`, `category`, `sortBy`, `sortOrder`, `archived`

## Workflows

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/workflows` | Authenticated | Paginated workflow list. |
| GET | `/workflows/stats` | Admin, CEO, Manager, HR | Workflow statistics. |
| POST | `/workflows` | Admin, CEO, Manager | Create workflow. |
| GET | `/workflows/:id` | Authenticated | Workflow details. |
| PATCH | `/workflows/:id` | Admin, CEO, Manager | Update workflow. |
| DELETE | `/workflows/:id` | Admin, CEO | Delete workflow. |
| PATCH | `/workflows/:id/duplicate` | Admin, CEO, Manager | Duplicate workflow. |
| PATCH | `/workflows/:id/toggle` | Admin, CEO, Manager | Toggle active/paused. |
| POST | `/workflows/:id/execute` | Admin, CEO, Manager | Execute workflow. |

## Analytics

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/analytics` | Admin, CEO, Manager | Analytics section. |
| POST | `/analytics/export` | Admin, CEO, Manager | Export analytics. |

## Consultant

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| POST | `/consultant/analyze` | Admin, CEO, Manager | Generate business analysis. |
| GET | `/consultant` | Authenticated | List consultant reports. |
| GET | `/consultant/recent` | Authenticated | Recent reports. |
| GET | `/consultant/:id` | Authenticated | Report details. |
| DELETE | `/consultant/:id` | Admin, CEO | Delete report. |
| POST | `/consultant/export` | Admin, CEO, Manager | Export report. |

## Reports

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| POST | `/reports/generate` | Admin, CEO, Manager | Generate AI report. |
| POST | `/reports/export` | Admin, CEO, Manager | Export AI report. |
| POST | `/reports/schedule` | Admin, CEO, Manager | Schedule report. |
| GET | `/reports/scheduled` | Admin, CEO, Manager | List schedules. |
| DELETE | `/reports/scheduled/:reportId` | Admin, CEO, Manager | Delete schedule. |

## Copilot, Memory, Voice, Meeting AI, Integrations, Uploads

| Prefix | Auth | Description |
| --- | --- | --- |
| `/copilot` | Authenticated | Context, suggestions, message, streaming message. |
| `/memory` | Admin, CEO | Memory CRUD/search/export/stats. |
| `/voice` | Authenticated | Voice session, commands, permissions, STT, TTS. |
| `/meetings/ai` | Authenticated | Transcription, summaries, actions, decisions, reports. |
| `/integrations` | Admin | Connect, disconnect, sync, health, logs. |
| `/uploads/single` | Authenticated | Single file upload with allowlisted file validation. |
| `/ai-config` | Admin | AI runtime config. `/runtime` requires internal service key. |

## AI Service API

Base URL:

```text
http://127.0.0.1:8000/api/v1
```

AI endpoints require `Authorization: Bearer <token>` or `x-ai-service-key`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/chat/agents` | List chat agents. |
| POST | `/chat` | Multi-agent chat response. |
| POST | `/chat/stream` | Streaming chat response. |
| GET | `/multi-agent/agents` | List multi-agent agents. |
| POST | `/multi-agent/chat` | Multi-agent response. |
| POST | `/multi-agent/chat/stream` | Multi-agent stream. |
| POST | `/rag/upload` | Upload knowledge file. |
| GET | `/rag/files` | List permitted knowledge files. |
| DELETE | `/rag/files/{document_id}` | Delete knowledge file. |
| POST | `/rag/query` | Semantic search. |
| POST | `/rag/ask` | RAG answer. |
| POST | `/rag/summarize` | Summarize documents. |
| POST | `/rag/explain` | Explain documents. |
| POST | `/business-intelligence/query` | BI query. |
| POST | `/business-intelligence/summary` | Weekly summary. |
| POST | `/analytics/predict` | Analytics prediction. |
| POST | `/voice/stt` | Speech to text. |
| POST | `/voice/tts` | Text to speech. |
| POST | `/voice/process` | Process voice input. |
| POST | `/reports/generate` | Generate report. |
| POST | `/reports/export/{report_id}` | Export report. |
| POST | `/reports/schedule` | Schedule report. |
| GET | `/memory` | Memory list. |
| POST | `/memory` | Create memory item. |
| POST | `/memory/search` | Search memory. |
| GET | `/backend/me` | Internal backend profile bridge. |
| GET | `/backend/projects` | Internal backend project bridge. |
| WS | `/ws/chat` | WebSocket chat. |
