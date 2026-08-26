# AI BOS — Multi-Developer Onboarding & Architecture Guide

Welcome to **AI BOS (Business Operating System)**. This guide is designed to help new developers quickly understand the project architecture, monorepo layout, domain module structure, and development workflows.

---

## 1. High-Level Architecture Overview

AI BOS is an enterprise-grade Business Operating System built on a **modular, domain-isolated monorepo architecture**. The system consists of:

1. **Backend Core (`backend/`)**: Node.js + Express + TypeScript + MongoDB (Mongoose) + Socket.io realtime engine.
2. **Admin App (`admin/`)**: Vite + React + TypeScript web app for **Owner** and **Administrator** management, monitoring, RBAC, backups, and system governance.
3. **Employee App (`frontend/`)**: Vite + React + TypeScript web app for workstation employees, managers, HR, CRM, finance, and biometric attendance.
4. **Shared Package (`shared/`)**: Reusable UI components, design system tokens, auth services, API clients, and TypeScript contracts shared between `admin` and `frontend`.
5. **Device Agent (`device-agent/`)**: Native Windows background service + interactive Session Helper for endpoint telemetry, app policy enforcement, and consented remote support.

```
AI_BOS_V2/
├── backend/            # Express REST API, WebSockets, DB Models, Services & Controllers
├── admin/              # Admin Portal (Owner & Administrator Ditto Dashboard)
├── frontend/           # Employee Portal (Workstation App)
├── shared/             # Shared Design System, UI Components & Auth Hooks
├── device-agent/       # Windows Endpoint Monitoring & Remote Support Agent
└── packaging/          # Electron & Installer packaging scripts
```

---

## 2. Monorepo Workspaces & Scripts

The project uses standard npm workspaces configured in the root `package.json`.

### Starting Development Servers
```bash
# Start Employee App dev server (Port 8080)
npm run frontend:dev

# Start Admin App dev server (Port 8081)
npm run admin:dev

# Start Backend API dev server (Port 5000)
npm run backend:dev
```

### Building & Testing
```bash
# Typecheck backend code
npm run backend:typecheck

# Run ESLint across web applications
npm run lint

# Execute full automated test suite (Unit & E2E)
npm run test

# Production build for all packages
npm run build
```

---

## 3. Domain-Driven Isolation for Multi-Developer Workflows

To prevent code conflicts and allow multiple developers to work on different features simultaneously:

- Each feature is encapsulated within its domain module inside `backend/src/` and `frontend/src/features/` or `admin/src/admin/features/`.
- Domain services expose clear TypeScript contracts. Do not directly mutate internal model state of another module without going through its service.

### Domain Module Structure Example (`backend/src/modules/` or `backend/src/`)
```
modules/
├── auth/           # Authentication, Token refresh, Password recovery
├── rbac/           # Role matrix, Permission catalog, Access checks
├── attendance/     # Biometric check-in/out, Geofencing, Shifts
├── face-biometrics/ # Face enrollment, Crypto template storage, Liveness checks
├── projects/       # Project boards, Milestones, Sprints, Epics
├── tasks/          # Kanban tasks, Checklists, Time tracking
├── crm/            # Leads, Sales pipelines, Product catalog
├── finance/        # Invoices, Payments, Tax rates, Budgets
├── monitoring/     # Device telemetry, Endpoint status, Screenshots
├── remote-support/ # Consent-based screen streaming & remote input
└── backup/         # Backup engine, Retention auto-pruning, Encrypted storage
```

---

## 4. Key Security & Architecture Patterns

### A. Authentication & Session Delivery
- User authentication is powered by JWT access tokens (short-lived) and HTTP refresh tokens.
- On login and token refresh, the server includes `permissions: string[]` in the session payload.
- Use the `usePermissions()` hook in UI components to check capabilities:
  ```tsx
  import { usePermissions } from "@shared/auth";

  function ProjectActions() {
    const { hasPermission } = usePermissions();

    return (
      <div>
        {hasPermission("project.create") && <Button>New Project</Button>}
      </div>
    );
  }
  ```

### B. Owner Master Control Switch
- **Owner** has perpetual full authority.
- **Owner** can toggle the **Administrator Control Mode** (`full_control` vs `read_only`) from the Admin Dashboard.
- When set to `read_only`, mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`) from Administrators are blocked with HTTP 403 Forbidden.

### C. Data Encryption & Biometrics
- Environment variables must supply 32-byte encryption secrets:
  - `ENCRYPTION_SECRET`: Backup file and system data encryption.
  - `BIOMETRIC_ENCRYPTION_SECRET`: Face template vector encryption.
- Face AI models are served from `/models/human/` in public static directories.

---

## 5. Adding New Features: Step-by-Step Developer Checklist

When adding a new feature:

1. **Define Permission Key** (if new capability):
   Add entry to `permissionCatalog` in `backend/src/constants/permissions.ts`.
2. **Define Database Schema & Model**:
   Add Mongoose model in `backend/src/models/`.
3. **Create Service & Controller**:
   Add business logic in `backend/src/services/` and request handler in `backend/src/controllers/`.
4. **Define Express Routes**:
   Mount route with `authenticate` and `requirePermission("your.permission.key")` in `backend/src/routes/`.
5. **Build UI Component & Hook**:
   Create component in `frontend/src/features/` or `admin/src/admin/features/` and gate actions using `usePermissions()`.
6. **Add Unit Test**:
   Create test in `tests/backend/` or `tests/frontend/` and run `npm run test`.
