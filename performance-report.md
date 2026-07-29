# Performance Optimization Report

Date: 2026-07-22

## Scope

- Frontend bundle size and route loading
- React rendering and memoization
- Client API caching
- Backend read-query efficiency
- Image transfer size
- AI streaming render pressure
- Pagination readiness

No UI workflows or API contracts were changed.

## Measurements

Production builds were measured from existing `dist` output before the optimization pass, then rebuilt and measured again after changes.

| App | Before total | After total | Before JS | After JS | Before largest chunk | After largest chunk | Largest chunk change |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Frontend | 1,316,933 B | 1,319,875 B | 1,260,781 B | 1,263,479 B | 458,993 B | 326,925 B | -28.8% |
| Admin | 1,416,607 B | 1,414,973 B | 1,363,731 B | 1,361,853 B | 460,741 B | 367,027 B | -20.3% |
| CEO | 1,380,704 B | 1,379,502 B | 1,328,848 B | 1,327,402 B | 464,313 B | 380,440 B | -18.1% |

Notes:

- Total bytes stayed nearly flat because vendor chunking creates a few more cacheable files.
- Largest blocking chunks dropped substantially, improving cache reuse and first-route parse pressure.
- Frontend file count dropped from 52 to 39, admin from 60 to 39, and CEO from 54 to 41.

## Optimizations Applied

### Bundle Size and Lazy Loading

- Added Vite `manualChunks` for React, motion, charting, forms/validation, and remaining vendor code in all three apps.
- Lazy-loaded global workspace chrome modules: command palette, AI assistant, quick actions, app experience, and voice provider.
- Deferred workspace chrome mounting until browser idle or a short timeout, reducing startup competition with the active route.

### React Rendering and Memoization

- Memoized global command palette and quick action components.
- Stabilized quick action and command palette handlers with `useCallback`.
- Updated `useApi` to avoid depending on the whole options object, preventing accidental repeated fetch/render loops when callers pass inline options.

### API Caching

- Added short-lived in-memory GET caching to the shared API client.
- Added in-flight GET request de-duplication for identical endpoint/auth combinations.
- Mutating requests clear the GET cache after successful writes, preserving current behavior while reducing redundant reads.

### Backend Queries

- Added compound Mongo indexes for common project filters/sorts:
  - archived + created date
  - archived + status + created date
  - archived + priority + deadline
  - category + status + created date
- Added workflow indexes for status, template, trigger type, execution count, and updated date sorting.
- Added consultant report status/date index.
- Changed consultant read paths to `.lean()` where hydrated documents are not needed.

### Streaming

- Batched AI assistant streaming updates with `requestAnimationFrame`.
- This keeps streaming visible while reducing React state commits during long responses.

### Image Optimization

- Reduced the remote profile header image request from `w=1600&q=80` to `w=1200&q=70`.

### Pagination

- Existing backend list contracts already enforce pagination with positive page/limit and max limit of 100.
- Query indexes now better support the current paginated list filters.

## Verification

Passed:

- `npm.cmd run frontend:build`
- `npm.cmd run admin:build`
- `npm.cmd run ceo:build`
- `npm.cmd run backend:build`

## Remaining Runtime Measurements

These require a running browser/API/database environment:

- Lighthouse/Web Vitals before/after
- React Profiler commit timings
- Mongo `explain()` output against production-like data
- API latency under concurrent requests
- Streaming response token-to-render latency
