---
name: agentmail-notifications
description: >-
  Integrate AgentMail for compliance email notifications including classification results,
  incident alerts, deadline reminders, team invitations, and weekly digests.
  Use when sending or configuring email notifications in ComplianceForge.
---

# ComplianceForge AgentMail Notifications

Adapted from the interviewbot-agentmail skill for EU AI Act compliance notifications.

**Docs**: https://docs.agentmail.to
**Domain**: complianceforge-ai.com (via AGENTMAIL_DOMAIN env var)

## Architecture

```
src/lib/email.ts               → AgentMailClient singleton, send functions
src/lib/email-templates.ts     → Branded HTML email templates
src/server/actions.ts           → Fire-and-forget email triggers after actions
```

## Email Types

| Function | Trigger | Template |
|----------|---------|----------|
| `sendClassificationResult` | After risk classification | Risk tier, recommendations, article refs |
| `sendIncidentAlert` | After incident creation | Severity-coded, NCA deadline reminder |
| `sendDeadlineReminder` | Calendar deadline approaching | Countdown, system name |
| `sendTeamInvite` | Team member invited | CTA button with invite URL |
| `sendWeeklyDigest` | Scheduled (future) | Org stats, overdue items, compliance scores |

## Setup

```env
AGENTMAIL_API_KEY=am_...
AGENTMAIL_DOMAIN=complianceforge-ai.com
```

## SDK Usage (TypeScript)

```typescript
import { AgentMailClient } from "agentmail";

const client = new AgentMailClient({ apiKey: env.AGENTMAIL_API_KEY });

await client.inboxes.messages.send(inboxId, {
  to: "user@example.com",
  subject: "Risk Classification Complete",
  text: "Your system has been classified as high-risk...",
  html: "<p>Your system has been classified...</p>",
});
```

## Key Rules

1. All email functions return boolean (true=sent, false=skipped/failed)
2. Missing API key = graceful skip with console warning
3. Missing org inboxId = graceful skip
4. Email triggers are fire-and-forget (void, not awaited)
5. Never block server actions on email delivery
6. All templates use inline CSS for email client compatibility
7. ComplianceForge dark theme branding with cyan accent
8. Per-org inboxes stored in Organization.agentmailInboxId
