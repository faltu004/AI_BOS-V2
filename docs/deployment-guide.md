# Deployment Guide

## Build Artifacts

Frontend portals:

```bash
npm run frontend:build
npm run admin:build
npm run ceo:build
```

Outputs:

- `frontend/dist`
- `admin/dist`
- `ceo/dist`

Backend:

```bash
npm run backend:build
npm run backend:start
```

Output:

- `backend/dist`

AI service:

```bash
cd ai-service
pip install .
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Environment Setup

Required production files:

- `backend/.env`
- `ai-service/.env`

Never commit real `.env` files.

## Static Frontend Hosting

Recommended:

- CDN-backed static hosting for each portal.
- Route fallback to `index.html`.
- Strong cache headers for hashed assets.
- Short/no-cache headers for `index.html`.
- Security headers at the edge.

## Backend Deployment

Recommended:

- Run `backend/dist/server.js` in a Node 22 runtime.
- Set `NODE_ENV=production`.
- Use a process manager or container orchestrator.
- Terminate TLS at load balancer/proxy.
- Use MongoDB Atlas or a managed MongoDB cluster.

## AI Service Deployment

Existing Dockerfile:

- `ai-service/Dockerfile`

Existing Compose file:

- `ai-service/docker-compose.yml`

Run from `ai-service` when Docker is available:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## Docker Status

Verified in repo:

- AI service Dockerfile exists.
- AI service Docker Compose exists.
- AI service Compose includes a health check.

Not present:

- Root full-stack Compose file.
- Backend Dockerfile.
- Frontend static-server Dockerfiles.

Local verification blocker:

- Docker CLI is not installed in this environment, so `docker compose config` could not be executed.

## Health Checks

Backend:

```text
GET /health
```

AI service:

```text
GET /health
```

Recommended production health model:

- Liveness: process responds.
- Readiness: verifies MongoDB connectivity and required AI runtime config.
- Deep health: optional dependency checks for model provider, vector storage, object storage.

## Monitoring

Current:

- Structured backend request logging with request IDs.
- AI request context logging with request IDs.

Recommended:

- OpenTelemetry traces across frontend/backend/AI.
- Metrics for latency, request counts, error rates, token usage, model failures, DB timings, queue depth, file upload rejection rate.
- Central log aggregation.
- Alerting for 5xx rate, auth failures, AI provider errors, MongoDB health, disk usage, and backup failure.

## CI/CD

Current repo status:

- No `.github/workflows` or equivalent CI/CD pipeline was found.

Recommended pipeline:

```text
install
typecheck
lint
test
coverage
build frontend/admin/ceo/backend
build AI container
security scan dependencies/images
deploy to staging
run smoke tests
manual approval
deploy production
```

## Rollback

Recommended:

- Keep last known-good frontend artifacts.
- Use immutable backend and AI images.
- Store release metadata: commit SHA, env version, migration version.
- Make database migrations backward compatible where possible.
