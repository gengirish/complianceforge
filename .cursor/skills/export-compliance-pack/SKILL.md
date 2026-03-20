---
name: export-compliance-pack
description: >-
  Export compliance documentation packs in HTML/PDF/DOCX format for regulatory submission.
  Use when working with document export, Annex IV packs, or regulatory filing features.
---

# ComplianceForge Export - Compliance Pack

## Architecture

```
src/lib/export-templates.ts             → HTML template generation
src/app/api/export/[systemId]/route.ts  → GET handler with format param
src/app/(dashboard)/documents/client.tsx → Export button in documents UI
```

## Formats

| Format | Content-Type | Method |
|--------|-------------|--------|
| HTML (default) | text/html | Browser print-to-PDF |
| PDF | application/pdf | Puppeteer rendering |
| DOCX | application/vnd...wordprocessingml | docx library |

## Compliance Pack Contents

1. **Cover Page** - System name, org, date, risk classification
2. **Table of Contents** - Anchored sections
3. **Executive Summary** - Key metrics and status
4. **System Overview** - All AiSystem fields
5. **Risk Classification** - Assessment details with article references
6. **Annex IV Documentation** - Each section as a chapter (latest version)
7. **Incident Log** - Table with severity, status, NCA reporting
8. **Compliance Checklist** - Article-by-article compliance indicators

## Key Rules

1. Auth required: `getOrCreateDbUser()` validates access
2. Org-scoped: only export systems belonging to user's organization
3. HTML is primary format (users print-to-PDF from browser)
4. PDF requires Puppeteer/Chromium (may not work in serverless)
5. DOCX uses `docx` npm package for Word document generation
6. Print CSS includes page breaks, A4 margins, headers/footers
7. EU AI Act branding with article references throughout
