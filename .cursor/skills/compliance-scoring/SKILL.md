---
name: compliance-scoring
description: >-
  Calculate and display smart compliance scores (0-100) for AI systems.
  Use when working with compliance metrics, scoring algorithms, or dashboard analytics.
---

# ComplianceForge Smart Compliance Scoring

## Architecture

```
src/lib/compliance-scoring.ts           → Score calculation + grading
src/app/(dashboard)/dashboard/
  compliance-scores.tsx                 → Score rings + breakdown UI
  page.tsx                              → Dashboard with org average
src/server/actions.ts                   → Auto-recalculate after actions
```

## Score Breakdown (0-100)

| Criterion | Max Points |
|-----------|-----------|
| Risk classification complete | 15 |
| Annex IV documentation | 20 (+5 per section) |
| Conformity assessment started | 10 (+15 if completed) |
| Incident response plan | 10 |
| All incidents resolved | 10 (-5 per open critical) |
| Post-market monitoring plan | 10 |
| Transparency disclosure | 10 |

## Grades

| Grade | Score | Color |
|-------|-------|-------|
| A | 90-100 | Green |
| B | 75-89 | Blue |
| C | 60-74 | Yellow |
| D | 40-59 | Orange |
| F | 0-39 | Red |

## Auto-Recalculation Triggers

Score is recalculated after: classification, document generation, incident actions,
conformity assessment updates, deadline completion, scan import.

## Key Rules

1. Score persisted on AiSystem.complianceScore
2. Org average = mean of all system scores
3. Grade displayed as colored ring/badge on dashboard
4. Breakdown shown on hover/click for transparency
