# Folder Structure

```text
.
  admin/                  Admin and manager React portal
  ai-service/             FastAPI AI microservice
  backend/                Express/MongoDB API
  ceo/                    CEO and executive React portal
  frontend/               Employee, HR, and sales React portal
  shared/                 Shared React UI, auth, platform, features, hooks, utilities
  tests/                  Node test runner suites for frontend/backend/E2E
  docs/                   Product, engineering, operations, and readiness documentation
```

## Frontend Portals

```text
frontend/src
  common/features         Shared employee-facing feature modules
  components              Portal-only layout and animation components
  data                    Workspace navigation/search/action data
  features/auth           Portal auth pages
  hr/features             HR-specific modules
  pages                   Public landing page
  sale/features           Sales-specific modules
```

```text
admin/src
  admin/features          Admin-only modules: admin records, AI config, settings
  common/features         Admin common modules: analytics, reports, consultant, dashboard
  data                    Admin workspace data
  features/auth           Admin auth pages
  manager/features        Manager modules: projects, workflows, tasks, meetings, employees
```

```text
ceo/src
  ceo/features            Executive modules: dashboard, BI, analytics, memory, agents, access
  data                    CEO workspace data
  features/auth           CEO-only auth pages
```

## Shared Package

```text
shared/src
  auth                    Shared auth schemas, pages, services, access control
  features                Shared analytics, consultant, reports
  hooks                   Reusable hooks
  lib                     API client, env, utilities
  platform                App shell, dashboards, AI assistant, quick actions
  profile                 Role-aware profile page
  styles                  Tailwind/global CSS
  ui                      Shared UI primitives
  voice                   Voice provider and controls
```

## Backend

```text
backend/src
  config                  Environment, app, upload config
  constants               Roles, workflow, analytics, project constants
  controllers             HTTP adapters
  database                Mongo connection, seed, transaction helper
  middleware              Auth, RBAC, validation, uploads, errors, logging
  models                  Mongoose schemas
  repositories            Data access layer
  routes                  API route definitions
  services                Business logic
  types                   Express, auth, API, integration types
  utils                   JWT, password, crypto, CSV, PDF, logging, response helpers
  validation              Zod schemas
```

## AI Service

```text
ai-service/app
  agents                  Domain agents and registry
  api                     Middleware, dependencies, errors
  api/v1/routes           FastAPI routers
  chains                  Chat chains
  config                  Pydantic settings
  embeddings              Embedding provider
  memory                  Conversation memory
  models                  Pydantic request/response models
  prompts                 System prompts
  rag                     Parser, chunker, retriever, vector store
  repositories            Memory repository
  services                AI, RAG, backend client, LLM gateway, reports, voice
  tools                   Backend tools
  utils                   Logging, errors, response, text budgeting
```

## Tests

```text
tests
  backend                 API, validation, DB schema, auth, repository, upload tests
  e2e                     HTTP smoke tests
  frontend                Frontend schema/session/utility tests
  helpers                 Test environment and browser-storage helpers

ai-service/tests          Pytest suites for health, chat, prompts, agents, RAG
```
