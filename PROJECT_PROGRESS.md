# AI BOS V2 — Project Progress, Master Audit & Handoff Document

> **Last Updated**: August 29, 2026  
> **Repository**: `AI BOS V2` (Business Operating System)  
> **Author**: WorknAI Technology Pvt Ltd  
> **Purpose**: Single source of truth documenting all completed features, bug fixes, file modifications, audit findings, architectural patterns, verification status, and pending roadmap items for seamless cross-session agent continuity.

---

## 1. Monorepo Architecture Overview

```
AI_BOS_V2/
├── backend/            # Express REST API, MongoDB/Mongoose, Socket.io, Background Jobs (Port 5000)
├── frontend/           # Employee Portal (React 18 + Vite + Tailwind + shadcn/ui) (Port 8080)
├── admin/              # Admin & Owner Management Portal (React 18 + Vite + Tailwind) (Port 8081)
├── shared/             # Shared UI design system, hooks, auth services, API contracts
├── device-agent/       # Windows Endpoint Native Agent (Service + Session Helper)
├── electron/           # Desktop App main process wrappers & security runtime
├── tls-gateway/        # Node.js HTTPS / TLS Reverse Proxy (Port 5443)
├── packaging/          # Electron installer configs (NSIS) & PowerShell deploy scripts
└── docs/               # Architecture, API, Database, and Admin documentation
```

> **Note**: The legacy CEO app has been completely removed from the project. The production system operates strictly with the **Admin Portal** (Owners & Administrators) and **Employee Portal** (Managers, HR, Sales, Finance, Frontline Employees).

---

## 2. Key Architecture & Security Specs

- **Authentication**: JWT access tokens (short-lived) + HTTP-only refresh cookies. Login/Refresh/`/auth/me` endpoints deliver user effective permissions in `session.user.permissions`.
- **RBAC & Hierarchy**: `permissionCatalog` → `requirePermission()` middleware → `usePermissions()` hook. Owner and Administrator roles bypass individual permission key requirements (`hasFullAccess`).
- **Owner Master Switch**: Owner can toggle Administrator mode between `full_control` and `read_only` (`administratorControlMode` in organization settings). When `read_only`, mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`) from Administrators return 403 Forbidden. Emits `ADMIN_CONTROL_MODE_CHANGED` socket event.
- **Device Authentication**: Dual-layer security model:
  - **New (Default & Active)**: Unique per-device token (`x-device-id`, `x-device-token`) with prefix `aibos_device_`.
  - **Legacy (Fallback)**: Shared `x-device-key` (`SERVICE_API_KEY`) enabled via `ALLOW_LEGACY_DEVICE_AUTH` for backward compatibility during agent migration.
- **Data Encryption**: 32-byte secret `ENCRYPTION_SECRET` for backups; `BIOMETRIC_ENCRYPTION_SECRET` for face vectors.

---

## 3. Detailed Feature Changelog & File Modifications

### A. Core Bug Fixes & Blockers Resolved
- **Backend Startup Blocker Fix**:
  - `[MODIFY]` `backend/src/config/env.ts` — Adjusted `AI_REQUEST_TIMEOUT_MS` Zod schema max limit from `120000` to `300000` ms to prevent process exit when `.env` is set to `150000` ms.
- **Admin UI Button Style Fix**:
  - `[MODIFY]` `shared/src/ui/button.tsx` — Added missing `destructive` button variant required by `AdminDashboardPage.tsx`.

### B. Notification Popup System (Windows & In-App)
- **Status**: ✅ Completed & Verified
- **Files Created / Modified**:
  - `[NEW]` `shared/src/notifications/NotificationPopupListener.tsx` — Stacked popups (max 4), 8s auto-dismiss, priority colors, category icons, native OS toast triggering when tab is inactive.
  - `[MODIFY]` `shared/src/notifications/index.ts` — Exported `NotificationPopupListener`.
  - `[MODIFY]` `shared/src/platform/AppShell.tsx` — Lazy-mounted `LazyNotificationPopupListener` inside `WorkspaceChrome`.
  - `[MODIFY]` `electron/employee-main.cjs` — Added `"notifications"` permission to Electron permission handler.
  - `[MODIFY]` `electron/admin-main.cjs` — Added `session` import + `configureMediaPermissions()` with `"notifications"`.

### C. Collaboration Hub (Company Messenger UI Polish)
- **Status**: ✅ Completed & Verified
- **Files Modified**:
  - `[MODIFY]` `shared/src/collaboration/CollaborationHub.tsx` — Added avatars for DMs & people list, room type icons, last message preview text, relative timestamps (*now*, *5m*, *2h*), unread count badges, date separators ("Today", "Yesterday"), back-to-back message grouping (5 min window), solid primary chat bubbles (`bg-primary`), animated 3-dot bounce typing indicator (`●●●`), polished mention suggestions with avatars, disabled send button when input is empty.

### D. Admin Password Manager & Forgot Password Integration
- **Status**: ✅ Completed & Verified
- **Files Modified**:
  - `[MODIFY]` `backend/src/utils/password.ts` — Added `generateTemporaryPassword()` with ambiguous character exclusion & Fisher-Yates shuffle.
  - `[MODIFY]` `backend/src/services/user.service.ts` — Added `resetPassword(actorUserId, actorRole, targetUserId)` enforcing hierarchy (`assertCanManage`), `mustChangePassword: true`, 24h expiry, password history entry, and audit logging.
  - `[MODIFY]` `backend/src/controllers/user.controller.ts` — Added `resetPassword` handler.
  - `[MODIFY]` `backend/src/routes/user.routes.ts` — Mounted `POST /:id/reset-password`.
  - `[MODIFY]` `backend/src/services/reset-password.service.ts` — Integrated `notifyAdminsOfResetRequest()` so employee forgot-password requests send high-priority system notifications to Owner/Administrators.
  - `[MODIFY]` `shared/src/employees/employees.api.ts` — Added `resetEmployeePassword(id)`.
  - `[MODIFY]` `shared/src/employees/EmployeesPage.tsx` — Added "Reset Password" button in employee profile view and a `TemporaryPasswordDialog` with copy-to-clipboard functionality.

### E. Live Activity Feed on Admin Dashboard
- **Status**: ✅ Completed & Verified
- **Files Modified**:
  - `[MODIFY]` `admin/src/common/features/dashboard/AdminDashboardPage.tsx` — Integrated `fetchAuditLogs({ limit: 5 })`, added `toActivityItem()` mapper, category icon/label maps, and relative time formatter.

### F. Backup Retention System & Default Schedule Seeding
- **Status**: ✅ Completed & Verified
- **Files Modified**:
  - `[MODIFY]` `backend/src/services/backup.service.ts` — Added default schedule seeding (`database`, `documents`, `full`), expired backup identification, file deletion, DB record removal, and retention pruning tied to hourly job scheduler.

### G. Dynamic LAN & Cloudflare Tunnel CORS Support
- **Status**: ✅ Completed & Verified
- **Files Modified**:
  - `[MODIFY]` `backend/src/config/app.ts` — Implemented dynamic CORS origin matcher supporting:
    - Explicit `CLIENT_ORIGIN` allowlist
    - Private LAN IP subnets (`192.168.x.x`, `10.x.x.x`, `172.16.x.x`–`172.31.x.x`)
    - Cloudflare Tunnel subdomains (`app-*`, `admin-*` → `api-*`)
  - `[MODIFY]` `shared/src/lib/env.ts` — Added automatic `api-` subdomain resolution for tunnel hostnames.

### H. Deployment Automation & Auto-Update Pipeline
- **Status**: ✅ Created & Verified
- **Files Created / Modified**:
  - `[NEW]` `packaging/server/deploy-to-main-pc.ps1` — Stage → backup → swap → health check → auto-rollback deployment script for Main PC (`D:\AI-BOS-Server`). Pure ASCII formatting for PowerShell 5.1 compatibility.
  - `[NEW]` `packaging/server/publish-device-agent-update.ps1` — Device agent release packaging script.
  - `[MODIFY]` `package.json` — Added `electron-updater` dependencies and packaging scripts:
    - `npm run package:admin:prepare`
    - `npm run package:employee:prepare`

---

## 4. Verification & Testing Status

| Workspace / Command | Result | Notes |
|---|---|---|
| `npm run test:js` | ✅ **148 / 148 Passed** | Complete unit test suite passing (includes DB repository mocks for DB-less tests) |
| `npm run backend:typecheck` | ✅ **0 Errors** | TypeScript compilation clean |
| `npm run frontend:build` | ✅ **Build Success** | Vite build + Service Worker build successful |
| `npm run admin:build` | ✅ **Build Success** | Vite build successful |

---

## 5. Deployment Guide & Main PC Specs

- **Main Server Path**: `D:\AI-BOS-Server` (Windows Scheduled Task: `AI BOS Backend Server`)
- **Main Server Hostname**: `ADMIN-WORKNAI`
- **TLS Gateway**: Running on port `5443`
- **Local Dev Endpoints**:
  - `frontend`: `http://127.0.0.1:8080`
  - `admin`: `http://127.0.0.1:8081` (or `http://127.0.0.1:5000`)
  - `backend`: `http://127.0.0.1:5000`

---

## 6. Pre-Existing Audit Findings & Future Backlog

### Audit Items Identified (Future Workstream)
1. **Face Biometrics Liveness Verification**: Face liveness evidence currently relies on client-reported scores; needs independent server-side vector validation.
2. **Device Challenge Binding**: Face verification challenge `deviceIdHash` is saved but not enforced at consumption time.
3. **Attendance Concurrency**: Concurrent check-in/check-out requires atomic DB transactions to prevent race conditions.
4. **Cloudflare Tunnel Setup**: `cloudflared.exe` is installed at `C:\Program Files (x86)\cloudflared\cloudflared.exe` on Main PC. Awaiting custom domain purchase for ingress configuration (`CLOUDFLARE_TUNNEL_SETUP.md`).
5. **SMTP Relay Configuration**: Optional Brevo SMTP setup (`smtp-relay.brevo.com:587`) for email password reset links. (In-app notifications work without SMTP).
6. **Module Control Tiles**: Customers, Products, Documents, Finance module cards in Admin panel currently set as "Not connected" placeholders (left as-is per user directive).

---

## 7. Instructions for Future AI Agents

1. **Read this document first** before making any code edits.
2. **Do NOT break existing contracts** in `shared/` as both `frontend` and `admin` depend on it.
3. **Pre-Deployment Checklist**: Before any production release, execute:
   - `git diff` review
   - `npm run backend:typecheck`
   - `npm run test:js` (verify 148/148 pass)
   - `npm run build`
4. **Obey user directives**: If the user says "dont make any changes", act strictly in read-only/audit mode.
