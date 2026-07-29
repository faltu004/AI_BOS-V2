# Admin Guide

## Admin Responsibilities

Admins manage:

- User and role visibility.
- AI runtime configuration.
- Integrations.
- Settings.
- Reports and analytics access.
- Security-sensitive operational workflows.

CEO and Admin have full access by design. Manager, HR, Sales, and Employee roles have limited access by role.

## User and Role Model

Roles:

- Admin
- CEO
- Manager
- HR
- Sales
- Employee

Public registration is server-side pinned to Employee. Privileged account creation or role changes should be handled through an admin-controlled workflow.

## AI Configuration

Admin AI configuration supports provider/model settings and encrypted API keys through backend storage.

Production recommendations:

- Use a strong `AI_CONFIG_ENCRYPTION_SECRET`.
- Rotate provider API keys.
- Restrict AI config routes to Admin.
- Monitor AI usage and provider errors.

## Integrations

Integration routes are Admin-only and validate integration IDs and API keys.

Recommended controls:

- Store integration secrets encrypted.
- Limit scopes to least privilege.
- Log sync failures and health checks.
- Rotate integration keys regularly.

## File Uploads

Allowed backend upload MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`

Controls:

- File size limit from `UPLOAD_MAX_FILE_SIZE_MB`.
- Extension allowlist.
- Filename normalization.
- Magic-byte validation.

Production recommendation: add antivirus/CDR scanning before storing or processing files.

## Security Operations

Monitor:

- Failed login bursts.
- Repeated upload rejections.
- AI endpoint 401/403 rates.
- 5xx errors by route.
- Token refresh failures.
- Integration sync failures.

Review regularly:

- Admin/CEO account list.
- AI provider keys and integration secrets.
- MongoDB users and network access.
- Backup restore results.

## Backups

Recommended:

- Enable MongoDB point-in-time recovery.
- Daily automated backups.
- Quarterly restore tests.
- Back up RAG/vector storage and uploaded documents.

Current repo status: backup automation is not implemented.

## Release Checklist

- `npm run build` passes.
- `npm run test:js` passes.
- `npm run coverage:js` meets 90%+ targeted coverage.
- AI pytest passes in CI.
- Production env vars are configured.
- Docker images are built and scanned.
- Health checks pass in staging.
- Rollback artifact is available.
