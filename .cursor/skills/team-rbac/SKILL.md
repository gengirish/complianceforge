---
name: team-rbac
description: >-
  Manage team members with role-based access control (admin, editor, viewer).
  Use when working with user permissions, team invitations, or access control.
---

# ComplianceForge Team RBAC

## Roles

| Role | Capabilities |
|------|-------------|
| admin | Full access: manage team, billing, API keys, all CRUD |
| editor | Create/edit systems, documents, assessments, incidents |
| viewer | Read-only access to all dashboard features |

## Architecture

```
src/lib/rbac.ts                         → Permission matrix + checkPermission()
src/lib/next-auth.ts                    → NextAuth config with PrismaAdapter
src/app/(dashboard)/settings/team/
  page.tsx                              → Team management server page
  team-client.tsx                       → Invite, role change, remove UI
src/app/(auth)/invite/
  page.tsx + client.tsx                 → Accept invitation flow
```

## Permission Actions

```
dashboard:view, inventory:*, classifier:*, documents:*,
audit:view, incidents:*, scanner:*, calendar:*, conformity:*,
settings:view, settings:billing, settings:api, team:*,
export:*
```

## Auth Flow

1. Demo login (cookie-based) → still works for pitch/demo
2. NextAuth OAuth (Google/GitHub) → for production users
3. `getAuthUser()` checks cookie first, then NextAuth session
4. OAuth buttons disabled with tooltip when credentials not configured

## Team Invitations

1. Admin invites via email + role selection
2. Invitation created with 7-day expiry token
3. Email sent via AgentMail (if configured)
4. Invitee clicks link → `/invite?token=xxx`
5. Token validated → user added to org with specified role
