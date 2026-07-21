# AI Business Operating System

Production-ready foundation for the AI BOS platform with separate frontend and backend packages.

## Project Structure

```text
ai-bos/
  frontend/   React 19, Vite, TypeScript, TailwindCSS, Shadcn UI
  backend/    Node.js, Express, TypeScript, MongoDB
```

## Package Names

- Root workspace: `ai-bos`
- Frontend app: `ai-bos-frontend`
- Backend API: `ai-bos-backend`

## Commands

```bash
npm run frontend:dev
npm run frontend:build
npm run frontend:lint

npm run backend:dev
npm run backend:build
npm run backend:typecheck
npm run backend:seed
```

Run the frontend from the root with:

```bash
npm run frontend:dev
```

Run the backend from the root with:

```bash
npm run backend:dev
```
