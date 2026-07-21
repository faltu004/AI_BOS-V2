# AI BOS Backend

Production-oriented Node.js, Express, MongoDB backend foundation for AI Business Operating System.

## Structure

- `config` - environment and app configuration
- `controllers` - HTTP request handlers
- `database` - MongoDB connection
- `middleware` - auth, RBAC, validation, errors, rate limiting
- `models` - Mongoose schemas
- `repositories` - data access layer
- `routes` - API route declarations
- `services` - business logic
- `utils` - logger, JWT, password hashing, API responses
- `validation` - Zod request schemas
- `types` - shared API and auth types
- `constants` - roles and auth constants

## Commands

```bash
npm install
npm run dev
npm run build
npm start
npm run seed
```

Copy `.env.example` to `.env` before running locally.

## API

Base path: `/api/v1`

- `GET /health` - service health
- `GET /api/v1` - API index
- `POST /api/v1/auth/register` - create user
- `POST /api/v1/auth/login` - login and return access/refresh tokens
- `POST /api/v1/auth/refresh-token` - rotate token pair
- `GET /api/v1/auth/me` - current authenticated user
- `PATCH /api/v1/auth/change-password` - change current user password
- `POST /api/v1/auth/logout` - clear refresh-token cookie
- `GET /api/v1/users` - list users, restricted to `Admin` and `CEO`
- `POST /api/v1/uploads/single` - authenticated single file upload via `multipart/form-data`

## RBAC

Supported roles:

- `Admin`
- `CEO`
- `Manager`
- `HR`
- `Employee`

## Seeder

`npm run seed` creates one user for each role with password `Admin@12345`.

## Production Notes

- Refresh tokens are supported through `httpOnly` cookies and request body fallback.
- Helmet, CORS, compression, cookie parser, rate limiting, request IDs, Morgan request logging, and global errors are configured centrally.
- File uploads use Multer memory storage with MIME type and file size limits. Connect cloud/object storage in the upload service before storing production files.
