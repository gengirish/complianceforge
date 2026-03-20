# ComplianceForge

**AI-powered EU AI Act compliance platform that turns a 6-month consulting engagement into a 6-minute automated workflow.**

> "Every company deploying AI in Europe faces up to €35M or 7% global turnover in fines. ComplianceForge makes compliance inevitable."

---

## The Problem

The EU AI Act becomes enforceable **August 2, 2026**. Every organization deploying AI systems in the EU must:
- Classify each AI system by risk tier (Unacceptable / High / Limited / Minimal)
- Maintain a living AI System Inventory (Article 6)
- Generate and maintain Technical Documentation per Annex IV (Article 11)
- Implement Risk Management Systems (Article 9)
- Ensure Data Governance compliance (Article 10)
- Conduct Conformity Assessments (Article 43)
- Maintain Audit Logs for 10+ years (Article 12)
- Register high-risk systems in the EU Database (Article 49)
- Report Serious Incidents within 15 days (Article 62)

**Current solutions**: Big-4 consulting firms charging €200K-2M per engagement, taking 6-18 months, producing static PDF reports that go stale immediately.

**The gap**: No software-first, continuously-updated compliance platform exists for the mid-market.

---

## The Solution

ComplianceForge is an **AI-native compliance operating system** that automates EU AI Act compliance end-to-end:

### Core Product

| Feature | What It Does | Articles Covered |
|---------|-------------|-----------------|
| **AI System Inventory** | Auto-discover and catalog all AI systems across your org | Art. 6, 49 |
| **Risk Classifier Engine** | Claude-powered risk tier classification with legal justification | Art. 5, 6, Annex III |
| **Doc Generator** | Auto-generate Annex IV technical documentation from system metadata | Art. 11, Annex IV |
| **Risk Management Studio** | Interactive risk assessment workflows with mitigation tracking | Art. 9 |
| **Data Governance Mapper** | Map training data provenance, bias testing, quality metrics | Art. 10 |
| **Conformity Assessment** | Guided self-assessment with evidence collection | Art. 43 |
| **Audit Trail** | Immutable, tamper-evident logging with 10-year retention | Art. 12 |
| **Incident Reporter** | Serious incident detection, classification, and NCA notification | Art. 62 |
| **Compliance Calendar** | Deadline tracking, regulatory change monitoring, team assignments | Art. 14, 72 |
| **GitHub/GitLab Scanner** | Scan repos for AI model usage, auto-populate inventory | Art. 6 |
| **Certificate Dashboard** | Visual compliance status per system with exportable certificates | Art. 43, 48 |

### Differentiators

1. **AI-Native**: Claude API powers risk classification, document generation, gap analysis, and recommendations - not static templates
2. **Continuous Compliance**: Living documents that update as your systems change, not point-in-time PDFs
3. **Developer-First**: GitHub integration, API-first architecture, CLI tools for CI/CD pipeline integration
4. **Multi-Tenant**: Serve consultants managing multiple client portfolios
5. **Regulation-Aware**: Embedded knowledge of all 180 articles, 13 annexes, 180 recitals of the EU AI Act

---

## Market

| Segment | Size | Price Point | Priority |
|---------|------|-------------|----------|
| **SMB** (1-50 AI systems) | ~500K companies in EU | €99-499/mo | Launch target |
| **Mid-Market** (50-500 AI systems) | ~50K companies | €499-2,499/mo | Growth |
| **Enterprise** (500+ AI systems) | ~5K companies | €2,499-9,999/mo | Expansion |
| **Consultants/Law Firms** | ~10K firms | €999-4,999/mo (multi-tenant) | Channel |

**TAM**: €8.5B (EU regulatory compliance software market)
**SAM**: €2.1B (AI Act-specific compliance)
**SOM**: €210M (achievable in 3 years with product-led growth)

---

## Tech Stack

### Frontend
- **Next.js 15** (App Router) + **React 19** + **TypeScript 5.7**
- **Tailwind CSS 4** + **shadcn/ui** component library
- **Recharts** for compliance dashboards
- **TipTap** for rich-text document editing
- **React Flow** for visual risk management workflows

### Backend
- **Next.js API Routes** + **tRPC** for type-safe API layer
- **Prisma ORM** + **PostgreSQL** (Neon/Supabase)
- **Redis** (Upstash) for caching and rate limiting
- **BullMQ** for background job processing

### AI & ML
- **Anthropic Claude API** (claude-sonnet-4-20250514) for:
  - Risk tier classification with legal reasoning
  - Technical documentation generation (Annex IV)
  - Gap analysis and remediation recommendations
  - Natural language querying of compliance status
  - Incident severity classification
- **Embeddings + Vector DB** (Pinecone/pgvector) for:
  - Semantic search across EU AI Act text
  - Similar system matching for risk precedents
  - Document similarity for template selection

### Infrastructure
- **Vercel** for frontend deployment
- **Fly.io** or **Railway** for backend services
- **AgentMail** for transactional emails (verification, alerts, reports)
- **Clerk** or **NextAuth** for authentication + SSO
- **Stripe** for billing and subscription management
- **PostHog** for product analytics
- **Sentry** for error tracking

### DevOps & Security
- **GitHub Actions** for CI/CD
- **Docker** for containerization
- **SOC2 Type II** compliance (required for enterprise sales)
- **GDPR-compliant** data handling (EU hosting via Vercel/Fly EU regions)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ComplianceForge                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Inventory │  │Risk Mgmt │  │Doc Gen   │   │
│  │  Views   │  │  CRUD    │  │  Studio  │  │  Engine  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────┴──────────────┴──────────────┴──────────────┴─────┐  │
│  │              tRPC API Layer (Type-Safe)                │  │
│  └────┬──────────────┬──────────────┬──────────────┬─────┘  │
│       │              │              │              │         │
│  ┌────┴─────┐  ┌─────┴────┐  ┌─────┴────┐  ┌─────┴────┐   │
│  │ Auth     │  │ Claude   │  │ Search   │  │ Email    │   │
│  │ (Clerk)  │  │ AI Core  │  │ (Vector) │  │(AgentMl) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │              │              │              │         │
│  ┌────┴──────────────┴──────────────┴──────────────┴─────┐  │
│  │         PostgreSQL + Redis + BullMQ                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Pricing

| Plan | Price | AI Systems | Features |
|------|-------|------------|----------|
| **Free** | €0/mo | Up to 3 | Risk classifier, basic inventory, community support |
| **Starter** | €99/mo | Up to 15 | + Doc generator, audit trail, email support |
| **Growth** | €299/mo | Up to 100 | + GitHub scanner, conformity assessment, calendar, API access |
| **Enterprise** | €999/mo | Unlimited | + SSO, multi-tenant, custom integrations, dedicated support, SLA |

---

## Roadmap

### Phase 1: Foundation (Weeks 1-4) — *Current*
- [x] Project architecture and skills setup
- [ ] Authentication + user management
- [ ] AI System Inventory (CRUD + import)
- [ ] Risk Classifier Engine (Claude-powered)
- [ ] Basic dashboard with compliance overview

### Phase 2: Documentation Engine (Weeks 5-8)
- [ ] Annex IV document generator
- [ ] Risk Management System templates
- [ ] Data Governance assessment workflows
- [ ] Audit trail with immutable logging

### Phase 3: Integration & Automation (Weeks 9-12)
- [ ] GitHub/GitLab repository scanner
- [ ] Conformity Assessment wizard
- [ ] Compliance calendar with deadline tracking
- [ ] AgentMail notification system

### Phase 4: Enterprise & Scale (Weeks 13-16)
- [ ] Multi-tenant architecture for consultants
- [ ] SSO (SAML/OIDC) integration
- [ ] API access with rate limiting
- [ ] Stripe billing integration
- [ ] EU Database registration helper

---

## Team

Building in public. Looking for:
- **Co-founder (Legal/Policy)**: EU AI Act expertise, regulatory affairs background
- **Co-founder (Engineering)**: Full-stack TypeScript, AI/ML integration experience

---

## License

Proprietary. All rights reserved.

---

*ComplianceForge — Because compliance shouldn't require a consulting army.*
