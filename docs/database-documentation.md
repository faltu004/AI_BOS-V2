# Database Documentation

## Database

The backend uses MongoDB through Mongoose. Configure the connection with:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/ai_bos
```

Connection code lives in `backend/src/database/mongo.ts`.

## Collections

### Users

Model: `backend/src/models/user.model.ts`

Key fields:

- `fullName`
- `companyName`
- `email`
- `passwordHash` with `select: false`
- `role`
- `isEmailVerified`
- `isActive`
- `lastLoginAt`

Indexes:

- `email` unique/indexed
- `role`
- `isActive`

### Projects

Model: `backend/src/models/project.model.ts`

Key fields:

- `projectName`, `projectCode`, `description`
- `category`, `priority`, `status`, `progress`
- `startDate`, `endDate`
- `budget`, `estimatedHours`
- `client`, `teamMembers`, `projectManager`
- `attachments`, `notes`, `tags`
- `isArchived`, `createdBy`, `updatedBy`

Indexes:

- Text index on `projectName`, `projectCode`, `description`, `client`, `tags`
- `projectCode` unique/indexed
- `isArchived + createdAt`
- `isArchived + status + createdAt`
- `isArchived + priority + endDate`
- `category + status + createdAt`

### Workflows

Model: `backend/src/models/workflow.model.ts`

Key fields:

- `name`, `description`, `status`, `isTemplate`
- `triggerType`, `triggerConfig`
- `steps`
- `tags`
- `executionCount`, `lastExecutedAt`
- `createdBy`, `updatedBy`

Indexes:

- Text index on `name`, `description`, `tags`
- `status + isTemplate`
- `status + updatedAt`
- `isTemplate + updatedAt`
- `triggerType + updatedAt`
- `executionCount + updatedAt`

### AI Config

Model: `backend/src/models/ai-config.model.ts`

Stores selected provider/model/runtime settings and encrypted provider API keys. API keys are selected only when needed and should not be exposed through normal API responses.

### Consultant Reports

Model: `backend/src/models/consultant.model.ts`

Stores generated business analyses, metrics, sections, recommendations, source availability, report status, report type, and period.

Indexes:

- `type + period + createdAt`
- `generatedBy + createdAt`
- `status + createdAt`

### Voice Sessions and Interactions

Models:

- `backend/src/models/voice-session.model.ts`
- `backend/src/models/voice-interaction.model.ts`

Used for voice command sessions, transcript history, and command execution audit trails.

## Repository Pattern

Repository classes own database calls:

- `ProjectRepository`
- `WorkflowRepository`
- `UserRepository`
- `ConsultantRepository`
- `AIConfigRepository`

Services call repositories; controllers do not directly query Mongoose.

## Transactions

`backend/src/database/transaction.ts` provides a transaction helper. Use it when a business operation must update more than one collection atomically.

## Migration Strategy

No migration framework is currently configured. For production, add one of:

- versioned migration scripts with `tsx`
- Mongock-style migrations
- CI-managed migration jobs

## Backup Strategy

Recommended production policy:

- Daily full MongoDB backups.
- Point-in-time recovery if using MongoDB Atlas.
- Retain daily backups for 14 days, weekly backups for 8 weeks, monthly backups for 12 months.
- Test restore quarterly.
- Back up AI RAG/vector storage with the same retention class as business documents.

Current repo status: backup automation is not implemented.
