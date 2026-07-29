# Architecture Guide

## Overview

AI BOS is split into five deployable surfaces:

- `frontend`: role-based employee, HR, and sales portal.
- `admin`: admin and manager operations portal.
- `ceo`: CEO/executive portal with full CEO/Admin access.
- `backend`: Express API with controllers, services, repositories, validation, RBAC, MongoDB, and security middleware.
- `ai-service`: FastAPI AI microservice for chat, multi-agent orchestration, RAG, reports, analytics, memory, voice, and backend-context access.

The frontend portals consume shared UI, auth, profile, dashboard, analytics, reports, consultant, voice, and platform code from `shared/src`.

## High-Level Flow

```text
Browser portals
  -> React route guards and role-specific navigation
  -> Backend REST API with JWT bearer auth
  -> MongoDB via Mongoose repositories
  -> AI service for AI/RAG/agent/voice workloads
  -> Backend context APIs when AI needs business data
```

## Frontend Architecture

Each portal is a Vite React application with lazy-loaded routes and shared platform chrome:

- `AppShell`: shared providers, route rendering, lazy route helpers, idle-mounted workspace chrome.
- `ProfessionalDashboard`: shared dashboard layout foundation.
- `auth`: shared auth schemas, access control, login layout, role selector, and mock session helpers.
- `ui`: shared button, card, dialog, inputs, loaders, empty states, toast, and filters.

Route-level access is enforced in `shared/src/auth/access-control.tsx`. Admin and CEO are full-access roles at the UI layer; backend RBAC remains authoritative.

## Backend Architecture

The backend follows layered boundaries:

- Routes define endpoint paths and middleware.
- Validation parses request bodies, params, and query strings with Zod.
- Controllers adapt HTTP requests to service calls.
- Services implement business behavior.
- Repositories isolate Mongoose queries.
- Models define MongoDB schemas and indexes.
- Middleware handles auth, RBAC, validation, errors, logging, request IDs, uploads, and rate limits.

This keeps API contracts stable while allowing services and repositories to evolve.

## AI Service Architecture

The AI service is a FastAPI app with:

- REST and streaming endpoints under `/api/v1`.
- Agent registry and role/domain agents.
- LLM gateway for provider abstraction, retry, fallback, and streaming.
- RAG parser, chunker, vector store, retriever, and permission filtering.
- Memory repository and memory service.
- Backend client for contextual business data.

AI endpoints require either a Bearer token or internal service key. Backend bridge routes require `x-ai-service-key`.

## Security Architecture

- JWT bearer authentication on backend protected routes.
- Current DB user role is authoritative on each authenticated request.
- RBAC middleware protects role-sensitive routes.
- Helmet security headers and CORS are configured centrally.
- Auth endpoints have tighter rate limits.
- Public registration is pinned to Employee server-side.
- File uploads use allowlisted MIME/extensions and magic-byte checks.
- AI routes reject anonymous direct use.
- Prompt hierarchy guardrails reduce prompt-injection risk.

## Performance Architecture

- Route-level lazy loading across portals.
- Vite manual chunks for React, charting, motion, forms, and vendor code.
- Shared API GET cache and in-flight request de-duplication.
- Mongo compound indexes for common list and report patterns.
- AI streaming updates are batched with animation frames.

## Scalability Notes

Current design scales cleanly by process:

- Serve each Vite build through CDN/static hosting.
- Run backend API as stateless Node containers.
- Run AI service as independent FastAPI containers.
- Scale MongoDB independently.
- Externalize RAG/vector storage for production-scale semantic search.

## Known Architecture Gaps

- No root full-stack Docker Compose file exists.
- No backend Dockerfile exists.
- No CI/CD workflow exists in the repo.
- AI RAG vector storage is JSON-file based and should move to managed vector storage for large production deployments.
