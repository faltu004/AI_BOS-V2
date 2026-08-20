# AI BOS Backend Server RC2 Package

This package is for later Main/Golden PC setup. It is not a desktop installer and must not be deployed during the RC artifact build pass.

## Contents

- `backend/dist`: compiled Backend/API server
- `backend/package.json`: backend runtime package metadata
- `backend/package-lock.json`: dependency lockfile for reproducible install on the server host
- `config/production.env.template`: production configuration placeholders only
- `uploads/.gitkeep`: persistent upload storage directory placeholder
- `update-repository/.gitkeep`: agent/update package repository placeholder

## First-Run Account Flow

Do not seed Owner or Administrator credentials. During Phase 25, start backend and database, confirm no Owner exists, use the local first Owner bootstrap, then let Owner configure Organization and Administrator credentials from the Admin app.

## Secrets

The package must not include `backend/.env`, JWT secrets, database passwords, device tokens, enrollment keys, Owner/Admin credentials, or biometric templates. Replace every `REPLACE_...` value in `production.env.template` during Main/Golden PC setup.

## Face Provider

RC2 includes `local-private-visual-face-template` in the backend code. It performs local template generation, encrypted template storage, verification, quality checks, single-subject geometry checks, and replay-like capture rejection. Full PAD/deepfake/challenge-response liveness is not runtime-proven and remains a Phase 25 validation item.

## Runtime Notes

Use the existing MongoDB architecture. Do not introduce a second database engine. Local LLM/Ollama setup is intentionally deferred and not part of this RC package.

## Logging

In production (`NODE_ENV=production`), the backend writes structured JSON logs to two places at once:

- stdout, for whatever process host (a console window, or Task Scheduler's own captured output if configured) is watching the process
- a size-rotated log file on disk, controlled by `LOG_DIR`, `LOG_MAX_FILE_SIZE_MB`, and `LOG_MAX_FILES` in `production.env.template`

Rotation is size-based only (no external tool required): when the active `backend.log` file reaches `LOG_MAX_FILE_SIZE_MB`, it is renamed to `backend.log.1` (existing `.1` becomes `.2`, and so on), and files beyond `LOG_MAX_FILES` are deleted automatically. No secrets, tokens, or passwords are logged.

Set `LOG_DIR` to an absolute path outside the deployment/update directory tree (for example `D:\AI-BOS-Server\logs`) so log history survives a redeploy of `backend/dist`.

In development (`NODE_ENV=development`), logs go to stdout only, formatted with `pino-pretty`; no file is written.

## Running the Backend as a Windows Task Scheduler Task

No Task Scheduler task exists in this package yet; the backend is started manually (`node backend/dist/server.js`) unless the operator sets one up. To run it as an unattended Task Scheduler task on the Golden PC:

```powershell
$action = New-ScheduledTaskAction `
  -Execute "node.exe" `
  -Argument "dist\server.js" `
  -WorkingDirectory "D:\AI-BOS-Server\backend"

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
  -Restart -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName "AI BOS Backend" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -User "SYSTEM" `
  -RunLevel Highest
```

Task Scheduler does not capture a task's stdout/stderr by default, which is exactly why the backend writes its own rotating log file independently of how it is launched (see Logging above) — inspect `LOG_DIR\backend.log` for startup/runtime failures rather than relying on Task Scheduler's own history.
