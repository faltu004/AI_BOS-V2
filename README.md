# Business Operating System

This is a multi-portal business operating system with dedicated employee, HR, sales, manager, admin, and CEO experiences. It combines React workspaces, a Node/Express API, MongoDB persistence, dashboards, collaboration, analytics, workflow, and organization modules.

## Applications

| App | Purpose | Default local URL |
| --- | --- | --- |
| `frontend` | Employee, HR, and sales portal | `http://127.0.0.1:8080` |
| `admin` | Admin and manager portal | `http://127.0.0.1:8081` |
| `ceo` | CEO and executive portal | `http://127.0.0.1:8082` |
| `backend` | Express API and MongoDB access | `http://127.0.0.1:5000` |

## Quick Start

```bash
npm install
copy backend\.env.example backend\.env
npm run backend:dev
npm run frontend:dev
npm run admin:dev
npm run ceo:dev
```

## Core Commands

```bash
npm run build
npm run lint
npm run test:js
npm run coverage:js
npm run test:e2e
npm run backend:build
```

## Documentation

- [Architecture Guide](docs/architecture-guide.md)
- [Folder Structure](docs/folder-structure.md)
- [API Documentation](docs/api-documentation.md)
- [Database Documentation](docs/database-documentation.md)
- [Deployment Guide](docs/deployment-guide.md)
- [Developer Guide](docs/developer-guide.md)
- [User Guide](docs/user-guide.md)
- [Admin Guide](docs/admin-guide.md)
- [Production Readiness Report](docs/production-readiness-report.md)

Existing audit reports:

- [Security Audit Report](security-audit-report.md)
- [Performance Report](performance-report.md)
- [Test Coverage Report](test-coverage-report.md)

## Production Status

The codebase has strong modular architecture, role-aware portals, security hardening, bundle optimization, and a production-oriented test suite. Remaining enterprise gaps are documented in the production readiness report, primarily around full-stack Docker/Compose, CI/CD, observability, backup automation, and executable AI tests in the current local environment.
