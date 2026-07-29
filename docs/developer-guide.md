# Developer Guide

## Prerequisites

- Node.js 22+
- npm 10+
- MongoDB local or managed instance
- Python 3.11+ for AI service
- Docker optional for AI service container

## Local Setup

```bash
npm install
copy backend\.env.example backend\.env
copy ai-service\.env.example ai-service\.env
```

Backend:

```bash
npm run backend:dev
```

Frontend portals:

```bash
npm run frontend:dev
npm run admin:dev
npm run ceo:dev
```

AI service:

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Development Principles

- Keep UI workflows stable unless the task explicitly changes them.
- Add route-level lazy loading for large pages.
- Put shared UI/logic in `shared/src`.
- Keep backend business logic in services, not controllers.
- Keep Mongoose queries in repositories.
- Validate every API body/query/param with Zod.
- Keep AI provider logic behind the LLM gateway.
- Treat AI context and uploaded documents as untrusted content.

## Adding a Frontend Feature

1. Choose the correct portal: `frontend`, `admin`, or `ceo`.
2. Place reusable code in `shared/src` only when it is used by more than one portal.
3. Add route config to the portal `App.tsx`.
4. Add role metadata to workspace data.
5. Use shared UI primitives before adding new component styles.
6. Add tests under `tests/frontend`.

## Adding a Backend Endpoint

1. Add or update a Zod schema in `backend/src/validation`.
2. Add repository methods if database access is needed.
3. Add service behavior.
4. Add controller adapter.
5. Register route with `authenticate`, `authorize`, and `validate`.
6. Add tests under `tests/backend`.

## Adding an AI Feature

1. Add/update Pydantic models.
2. Add service behavior.
3. Keep provider calls inside `llm_gateway`.
4. Add prompt-injection constraints for untrusted context.
5. Add route dependency requiring auth or service key.
6. Add pytest coverage under `ai-service/tests`.

## Test Commands

```bash
npm run test:frontend
npm run test:backend
npm run test:e2e
npm run test:js
npm run coverage:js
npm run ai:test
```

Current coverage command:

```bash
npm run coverage:js
```

Targeted JS/TS coverage: 93.49% line coverage.

## Build Commands

```bash
npm run frontend:build
npm run admin:build
npm run ceo:build
npm run backend:build
npm run build
```

## Security Checklist for Pull Requests

- Are all API inputs validated?
- Is authorization enforced server-side?
- Are privileged roles protected?
- Are uploaded files allowlisted and size-limited?
- Are secrets kept out of logs and browser storage?
- Are AI prompts protected against prompt injection?
- Are external service errors handled safely?
- Are tests added for security-sensitive behavior?
