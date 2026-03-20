---
name: public-rest-api
description: >-
  Build and maintain the public REST API with API key authentication for external integrations.
  Use when working with API routes, API key management, or external system integration.
---

# ComplianceForge Public REST API

## Architecture

```
src/lib/api-auth.ts                    → API key validation + generation
src/app/api/v1/
  systems/route.ts                     → GET list, POST create
  systems/[id]/route.ts                → GET, PATCH, DELETE
  systems/[id]/classify/route.ts       → POST trigger classification
  incidents/route.ts                   → GET list, POST create
src/app/(dashboard)/settings/api/
  page.tsx                             → API key management UI
  api-keys-manager.tsx                 → Client component
```

## API Key Format

- Prefix: `cf_` + 24 random bytes (base64url)
- Storage: SHA-256 hash in `ApiKey.keyHash`, prefix in `ApiKey.keyPrefix`
- Auth header: `Authorization: Bearer cf_xxxxxxxxxxxxx`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/systems` | List all AI systems |
| POST | `/api/v1/systems` | Create AI system |
| GET | `/api/v1/systems/:id` | Get system details |
| PATCH | `/api/v1/systems/:id` | Update system |
| DELETE | `/api/v1/systems/:id` | Delete system |
| POST | `/api/v1/systems/:id/classify` | Trigger risk classification |
| GET | `/api/v1/incidents` | List incidents |
| POST | `/api/v1/incidents` | Create incident |

## Response Format

```json
// Success
{ "data": { ... } }      // 200 or 201

// Error
{ "error": "message" }   // 400, 401, 404
```

## Key Rules

1. All routes validate API key via `validateApiKey(request)`
2. API keys are org-scoped -- all data filtered by organization
3. Raw key shown only once at creation time
4. Revoked keys immediately stop working
5. `lastUsedAt` updated on every valid request
6. Classification via API uses the same Claude/mock logic as the UI
