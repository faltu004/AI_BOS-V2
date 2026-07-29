# Security Audit Report

Date: 2026-07-22

## Scope

- Authentication, authorization, JWT, RBAC, CSRF, XSS, injection, secrets, uploads, API validation, prompt injection, and AI endpoint security.
- Backend Express API, AI FastAPI service, and frontend usage patterns were reviewed.
- Critical and high-confidence issues were fixed without changing public API response contracts.

## Standards Referenced

- OWASP API Security Top 10 2023: broken object authorization, broken authentication, unrestricted resource consumption, security misconfiguration.
  https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP Authorization Cheat Sheet: deny by default, least privilege, validate permissions on every request.
  https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP File Upload Cheat Sheet: extension allowlists, type verification, safe names, size limits, authenticated upload.
  https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP Input Validation Cheat Sheet: allowlist validation and server-controlled paths.
  https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

## Critical Issues Fixed

### Public Privilege Escalation

Status: Fixed

Public registration accepted the requested role. A caller could request a privileged role such as Admin or CEO. Registration now accepts the same request shape but creates public accounts as `Employee` server-side.

Changed:

- `backend/src/services/auth.service.ts`

### JWT Role Trust

Status: Fixed

The authentication middleware fetched the user record but trusted the role from the JWT payload. Stale or forged role claims could keep privileges after a role change if a token was still valid. The middleware now uses the current database role.

Changed:

- `backend/src/middleware/auth.middleware.ts`

### JWT Hardening

Status: Fixed

JWT signing and verification now pin HS256, issuer, and audience. Production startup now rejects JWT secrets shorter than 32 characters.

Changed:

- `backend/src/utils/jwt.ts`
- `backend/src/config/env.ts`

### Anonymous AI Endpoint Access

Status: Fixed

Several AI service routes accepted missing Authorization headers. AI routes now require either a Bearer token or the internal service key. Memory endpoints no longer trust caller-supplied user IDs for storage scope.

Changed:

- `ai-service/app/api/dependencies.py`
- `ai-service/app/api/v1/routes/chat.py`
- `ai-service/app/api/v1/routes/multi_agent.py`
- `ai-service/app/api/v1/routes/business_intelligence.py`
- `ai-service/app/api/v1/routes/analytics.py`
- `ai-service/app/api/v1/routes/voice.py`
- `ai-service/app/api/v1/routes/report_ai.py`
- `ai-service/app/api/v1/routes/meeting_ai.py`
- `ai-service/app/api/v1/routes/rag.py`
- `ai-service/app/api/v1/routes/memory.py`

### File Upload Spoofing

Status: Fixed

The upload endpoint trusted client MIME type only. Uploads now enforce safe filename rules, extension allowlists, MIME allowlists, size limits, and magic-byte checks for PDF/JPEG/PNG/WebP.

Changed:

- `backend/src/config/upload.ts`
- `backend/src/middleware/upload.middleware.ts`
- `backend/src/services/upload.service.ts`

### RAG Upload Resource Exhaustion

Status: Fixed

RAG document upload read entire files without an explicit service-level cap. A max upload size setting was added, and uploaded filenames are normalized to basename-only metadata.

Changed:

- `ai-service/app/config/settings.py`
- `ai-service/app/services/rag_service.py`

### CSRF on Cookie Refresh

Status: Fixed

Refresh-token cookies now use `SameSite=Lax`. Cookie-only refresh requests require the `x-csrf-token: refresh-token` header. Body-token refresh remains backward compatible.

Changed:

- `backend/src/utils/cookies.ts`
- `backend/src/controllers/auth.controller.ts`

### Missing API Validation

Status: Fixed

Report and integration routes now validate request bodies and params before controller execution. Memory route ordering was corrected so `/search` and `/stats/:userId` are not captured by `/:id`.

Changed:

- `backend/src/routes/report-ai.routes.ts`
- `backend/src/routes/integration.routes.ts`
- `backend/src/routes/memory.routes.ts`
- `backend/src/validation/report-ai.validation.ts`
- `backend/src/validation/integration.validation.ts`

### Prompt Injection

Status: Improved

Base AI prompts now explicitly treat user text, history, uploads, retrieved documents, and tool output as untrusted evidence that cannot override system, role, secret, or access-control instructions.

Changed:

- `ai-service/app/prompts/system.py`
- `ai-service/app/agents/base.py`

### Production Misconfiguration

Status: Fixed

Production startup now rejects wildcard CORS origins in backend and AI service settings. The AI service also rejects the default internal service key in production.

Changed:

- `backend/src/config/env.ts`
- `ai-service/app/config/settings.py`

## Review Results

### Authentication

- Passwords are hashed with bcrypt.
- Auth endpoints now have a stricter auth-specific rate limiter.
- Public registration no longer grants privileged roles.

### Authorization and RBAC

- Backend route groups generally enforce `authenticate` plus RBAC middleware.
- CEO/Admin full access remains intentionally preserved.
- Current DB role is now authoritative at request time.

### XSS

- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or `document.write` usage was found in app code.
- React escaping protects displayed user strings under the reviewed patterns.

### Injection

- SQL injection is not directly applicable because the backend uses MongoDB/Mongoose, not SQL.
- No raw Mongo operator construction from unvalidated objects was found on reviewed list endpoints.
- Zod schemas reject non-string query payloads for common filters.

### Secrets

- No hardcoded production API keys or tokens were found in source.
- Seed credentials remain documented development data and should not be deployed.
- AI service production now rejects the default internal service key.

## Verification

Passed:

- `npm.cmd run backend:build`

Blocked by local environment:

- `python -m compileall ai-service/app`
- `.venv/Scripts/python.exe -m compileall ai-service/app`

Both Python commands failed because the local Python executable points to an unavailable Windows Store target or terminated logon session.

## Remaining Recommendations

- Add integration tests for role escalation, JWT role downgrade, CSRF refresh, upload spoofing, and anonymous AI route rejection.
- Add real JWT validation inside the AI service or route AI traffic through the backend only.
- Add persistent refresh-token rotation/revocation storage.
- Add antivirus/CDR scanning before storing or parsing documents in production.
- Add object-level authorization checks for record ownership if the app later supports multi-tenant data boundaries.
- Add security headers/CSP for frontend deployments at the hosting layer.
