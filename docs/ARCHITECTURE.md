# ComplianceForge Architecture

## System Overview

```
                    ┌─────────────────────────────────┐
                    │          USERS                   │
                    │  Compliance Officers, CTOs,      │
                    │  Legal Teams, Auditors           │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │     NEXT.JS FRONTEND             │
                    │  (Vercel Edge — EU Region)       │
                    ├──────────────────────────────────┤
                    │  Landing Page                    │
                    │  Auth (Clerk SSO)                │
                    │  Dashboard                       │
                    │  AI System Inventory             │
                    │  Risk Classifier UI              │
                    │  Document Editor (TipTap)        │
                    │  Audit Trail Viewer              │
                    │  Compliance Calendar             │
                    │  Settings & Billing              │
                    └───────────────┬─────────────────┘
                                    │ tRPC (type-safe)
                    ┌───────────────▼─────────────────┐
                    │     API LAYER                    │
                    │  (Next.js API Routes + tRPC)     │
                    ├──────────────────────────────────┤
                    │  systemRouter                    │
                    │  assessmentRouter                │
                    │  documentRouter                  │
                    │  auditRouter                     │
                    │  incidentRouter                  │
                    │  billingRouter                   │
                    └──┬──────┬──────┬──────┬─────────┘
                       │      │      │      │
          ┌────────────▼┐ ┌──▼────┐ ┌▼─────┐ ┌▼──────────┐
          │  CLAUDE AI   │ │PRISMA │ │REDIS │ │ AGENTMAIL │
          │  (Anthropic) │ │(Neon) │ │(Up-  │ │ (Email)   │
          ├──────────────┤ ├───────┤ │stash)│ ├───────────┤
          │Risk Classify │ │AI Sys │ ├──────┤ │Compliance │
          │Doc Generate  │ │Assess │ │Cache │ │ Alerts    │
          │Gap Analysis  │ │Docs   │ │Rate  │ │Incident   │
          │NLP Search    │ │Audit  │ │Limit │ │ Notify    │
          │Incident Eval │ │Users  │ │Queue │ │Report     │
          └──────────────┘ │Org    │ └──────┘ │ Delivery  │
                           └───┬───┘          └───────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │     POSTGRESQL (Neon)             │
                    ├──────────────────────────────────┤
                    │  organizations                   │
                    │  users                           │
                    │  ai_systems                      │
                    │  assessments                     │
                    │  documents                       │
                    │  incidents                       │
                    │  audit_logs (append-only)        │
                    │  compliance_deadlines            │
                    └──────────────────────────────────┘
```

## Data Flow: Risk Classification

```
1. User adds AI system to inventory
   └→ POST /trpc/system.create
      └→ Prisma: INSERT ai_systems
      └→ Prisma: INSERT audit_logs

2. User requests risk classification
   └→ POST /trpc/assessment.classify
      └→ Claude API: classifyRiskTier(systemMetadata)
         └→ Returns: { riskTier, confidence, justification, ... }
      └→ Prisma: INSERT assessments
      └→ Prisma: UPDATE ai_systems SET risk_tier
      └→ Prisma: INSERT audit_logs
      └→ AgentMail: Send classification notification (if configured)

3. System generates Annex IV documentation
   └→ POST /trpc/document.generate
      └→ Claude API: generateDocumentSection() × 17 sections
      └→ Prisma: INSERT documents (per section)
      └→ Prisma: INSERT audit_logs
      └→ AgentMail: Send report ready notification
```

## Security Architecture

```
┌──────────────────────────────────────────────────┐
│                 SECURITY LAYERS                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  1. NETWORK                                       │
│     ├─ HTTPS enforced (TLS 1.3)                  │
│     ├─ CSP headers                               │
│     ├─ CORS restricted to app domain             │
│     └─ Rate limiting (Upstash Redis)             │
│                                                   │
│  2. AUTHENTICATION                                │
│     ├─ Clerk (SSO/SAML/OIDC/MFA)                │
│     ├─ JWT validation on every request           │
│     └─ Session management (httpOnly cookies)      │
│                                                   │
│  3. AUTHORIZATION                                 │
│     ├─ RBAC: Admin > CO > Auditor > Viewer       │
│     ├─ Organization-scoped data isolation         │
│     └─ Feature gating by subscription plan        │
│                                                   │
│  4. DATA PROTECTION                               │
│     ├─ PII encrypted at rest (AES-256)           │
│     ├─ Parameterized queries (Prisma)            │
│     ├─ Input validation (Zod schemas)            │
│     └─ EU-region hosting (GDPR)                  │
│                                                   │
│  5. AUDIT                                         │
│     ├─ Append-only audit logs                    │
│     ├─ 10-year retention (Art. 12)               │
│     ├─ Tamper-evident logging                    │
│     └─ All AI API calls logged                   │
│                                                   │
└──────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│                    VERCEL (EU)                    │
│  ┌─────────────┐  ┌────────────┐                │
│  │ Next.js SSR  │  │ Edge       │                │
│  │ + API Routes │  │ Middleware │                │
│  └──────┬──────┘  └─────┬──────┘                │
│         │                │                        │
│  ┌──────▼────────────────▼──────┐                │
│  │        Serverless Functions    │                │
│  │  (tRPC handlers, Claude API)  │                │
│  └───────────────┬───────────────┘                │
└──────────────────┼───────────────────────────────┘
                   │
     ┌─────────────┼────────────────────┐
     │             │                    │
┌────▼────┐  ┌────▼─────┐  ┌──────────▼──┐
│  Neon   │  │ Upstash  │  │  Anthropic  │
│ Postgres│  │  Redis   │  │  Claude API │
│  (EU)   │  │  (EU)    │  │             │
└─────────┘  └──────────┘  └─────────────┘
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Next.js 15 App Router | SSR for SEO, server components for performance, API routes colocation |
| API | tRPC | End-to-end type safety, no code generation, great DX |
| Database | Neon PostgreSQL | Serverless, EU regions, branching for dev/staging |
| ORM | Prisma | Type-safe queries, migration management, schema-first |
| AI | Claude claude-sonnet-4-20250514 | Best reasoning for legal/compliance classification, structured output |
| Auth | Clerk | SSO/MFA out of box, organization management, minimal code |
| Email | AgentMail | API-first, SOC2 certified, attachment support |
| Hosting | Vercel EU | Edge network, EU data residency, zero-config deployment |
| Cache | Upstash Redis | Serverless, EU region, rate limiting built-in |
