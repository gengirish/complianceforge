---
name: compliance-calendar
description: >-
  Manage compliance deadlines with auto-generation based on risk classification.
  Use when working with deadline tracking, EU AI Act enforcement timeline, or calendar features.
---

# ComplianceForge Compliance Calendar

## Architecture

```
src/lib/deadlines.ts                → Auto-generation logic per risk tier
src/app/(dashboard)/calendar/
  page.tsx                          → Server component
  client.tsx                        → Timeline UI with filters
src/server/actions.ts               → createDeadlineAction, completeDeadlineAction
```

## Auto-Generated Deadlines

### High-Risk Systems

| Deadline | Days | Category |
|----------|------|----------|
| Implement risk management system | 60 | risk_management |
| Complete Annex IV documentation | 90 | documentation |
| Complete conformity assessment | 120 | assessment |
| Register in EU database | 150 | registration |
| Establish post-market monitoring | 180 | risk_management |

### Limited-Risk Systems

| Deadline | Days | Category |
|----------|------|----------|
| Implement transparency disclosure | 60 | transparency |

### All Systems

| Deadline | Date | Category |
|----------|------|----------|
| EU AI Act full enforcement | Aug 2, 2026 | enforcement |

## Key Rules

1. Deadlines auto-generated after risk classification in `classifySystemAction`
2. Idempotent: won't duplicate if classification is re-run
3. Status: pending → completed (via completeDeadlineAction)
4. Overdue = pending + past dueDate
5. Priority: low, medium, high, critical
6. Categories: documentation, assessment, registration, risk_management, transparency, enforcement
