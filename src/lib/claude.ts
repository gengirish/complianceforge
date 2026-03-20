import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface RiskClassificationResult {
  riskTier: "unacceptable" | "high" | "limited" | "minimal";
  confidence: number;
  justification: string;
  keyArticles: number[];
  annexIiiCategory: string | null;
  requirements: string[];
  recommendations: string[];
  exceptionsConsidered: string[];
}

export interface SystemMetadata {
  name: string;
  sector: string;
  useCase: string;
  dataInputs?: string;
  decisionImpact?: string;
  endUsers?: string;
  deploymentRegion?: string;
}

/** Rule-based classifier used on Free plan and when the API is unavailable. */
export function mockClassifyRiskTier(
  system: SystemMetadata
): RiskClassificationResult {
  const s = system.sector.toLowerCase();
  const u = system.useCase.toLowerCase();

  if (
    u.includes("social scoring") ||
    u.includes("subliminal") ||
    u.includes("facial recognition database")
  ) {
    return {
      riskTier: "unacceptable",
      confidence: 0.92,
      justification: `The system "${system.name}" falls under Article 5 prohibited practices. ${system.useCase} constitutes a prohibited AI practice under the EU AI Act.`,
      keyArticles: [5],
      annexIiiCategory: null,
      requirements: ["System must be withdrawn from the EU market"],
      recommendations: ["Immediately cease deployment", "Consult legal counsel"],
      exceptionsConsidered: [],
    };
  }

  if (
    s.includes("healthcare") ||
    s.includes("law enforcement") ||
    s.includes("biometric") ||
    s.includes("employment") ||
    s.includes("education") ||
    s.includes("financial") ||
    s.includes("migration") ||
    s.includes("justice") ||
    u.includes("credit scor") ||
    u.includes("hiring") ||
    u.includes("cv screen") ||
    u.includes("medical diagn")
  ) {
    const category = s.includes("financial")
      ? "5(b) - Access to essential services"
      : s.includes("employment")
        ? "4 - Employment and workers management"
        : s.includes("education")
          ? "3 - Education and vocational training"
          : s.includes("healthcare")
            ? "1 - Biometric identification (medical context)"
            : s.includes("law enforcement")
              ? "6 - Law enforcement"
              : "High-risk per Annex III";

    return {
      riskTier: "high",
      confidence: 0.87,
      justification: `The system "${system.name}" in the ${system.sector} sector falls under Annex III Category ${category}. Per Article 6(2), AI systems referred to in Annex III are high-risk. Use case: ${system.useCase}.`,
      keyArticles: [6, 9, 10, 11, 12, 13, 14, 15, 43],
      annexIiiCategory: category,
      requirements: [
        "Risk Management System (Art. 9)",
        "Data Governance (Art. 10)",
        "Technical Documentation — Annex IV (Art. 11)",
        "Record-Keeping / Logging (Art. 12)",
        "Transparency to Deployers (Art. 13)",
        "Human Oversight (Art. 14)",
        "Accuracy, Robustness, Cybersecurity (Art. 15)",
        "Conformity Assessment (Art. 43)",
        "EU Database Registration (Art. 49)",
      ],
      recommendations: [
        "Generate Annex IV technical documentation",
        "Implement automatic logging system",
        "Conduct conformity self-assessment",
        "Register system in EU AI Database",
        "Establish post-market monitoring plan",
      ],
      exceptionsConsidered: [
        "Art. 6(3)(a) - Narrow procedural task: Not applicable — system makes substantive decisions",
      ],
    };
  }

  if (
    u.includes("chatbot") ||
    u.includes("content generat") ||
    u.includes("deepfake") ||
    u.includes("emotion recogn")
  ) {
    return {
      riskTier: "limited",
      confidence: 0.83,
      justification: `The system "${system.name}" has transparency obligations under Article 50. Users must be informed they are interacting with an AI system.`,
      keyArticles: [50],
      annexIiiCategory: null,
      requirements: [
        "Transparency disclosure to users (Art. 50)",
        "AI-generated content labeling (Art. 50)",
      ],
      recommendations: [
        "Add clear AI disclosure in user interface",
        "Label AI-generated content appropriately",
        "Document transparency measures",
      ],
      exceptionsConsidered: [],
    };
  }

  return {
    riskTier: "minimal",
    confidence: 0.78,
    justification: `The system "${system.name}" in the ${system.sector} sector does not fall under prohibited practices (Art. 5), high-risk categories (Art. 6/Annex III), or transparency obligations (Art. 50). Classified as minimal risk.`,
    keyArticles: [95],
    annexIiiCategory: null,
    requirements: ["No mandatory requirements — voluntary codes of conduct encouraged (Art. 95)"],
    recommendations: [
      "Consider adopting voluntary codes of conduct",
      "Maintain basic system documentation",
      "Monitor regulatory updates for reclassification",
    ],
    exceptionsConsidered: [],
  };
}

export async function classifyRiskTier(
  system: SystemMetadata
): Promise<RiskClassificationResult> {
  const anthropic = getClient();

  if (!anthropic) {
    return mockClassifyRiskTier(system);
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an EU AI Act compliance expert. Classify the following AI system by risk tier.

System Name: ${system.name}
Sector: ${system.sector}
Use Case Description: ${system.useCase}
Data Inputs: ${system.dataInputs ?? "Not specified"}
Decision Impact: ${system.decisionImpact ?? "Not specified"}
End Users: ${system.endUsers ?? "Not specified"}
Deployment Region: ${system.deploymentRegion ?? "EU"}

Follow this classification sequence:
1. Check Article 5 prohibited practices → "unacceptable"
2. Check Article 6 + Annex III high-risk categories → "high"
3. Evaluate Article 6(3) exceptions that might downgrade
4. Check Article 50 transparency obligations → "limited"
5. Default → "minimal"

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "riskTier": "unacceptable" | "high" | "limited" | "minimal",
  "confidence": 0.0-1.0,
  "justification": "2-3 sentence legal reasoning citing specific articles",
  "keyArticles": [array of relevant article numbers],
  "annexIiiCategory": "e.g. 5(b) - Credit scoring" or null,
  "requirements": ["array of compliance requirements for this tier"],
  "recommendations": ["array of next steps"],
  "exceptionsConsidered": ["any Art. 6(3) exceptions evaluated"]
}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return mockClassifyRiskTier(system);
    }

    return JSON.parse(textBlock.text) as RiskClassificationResult;
  } catch (error) {
    console.error("Claude API error, using mock classifier:", error);
    return mockClassifyRiskTier(system);
  }
}

export async function generateDocumentSection(
  system: SystemMetadata & { riskTier: string },
  sectionNumber: number,
  sectionTitle: string
): Promise<string> {
  const anthropic = getClient();

  if (!anthropic) {
    return generateMockSection(system, sectionNumber, sectionTitle);
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are a technical writer specializing in EU AI Act compliance.

Generate Section ${sectionNumber}: ${sectionTitle} of Annex IV technical documentation.

System metadata:
- Name: ${system.name}
- Sector: ${system.sector}
- Risk Tier: ${system.riskTier}
- Use Case: ${system.useCase}
- Data Inputs: ${system.dataInputs ?? "Not specified"}
- Decision Impact: ${system.decisionImpact ?? "Not specified"}

Generate professional, legally-sound documentation suitable for an EU AI Act conformity assessment. Flag areas needing additional info with [ACTION REQUIRED: ...].

Output format: Markdown starting at ## level.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return generateMockSection(system, sectionNumber, sectionTitle);
    }
    return textBlock.text;
  } catch {
    return generateMockSection(system, sectionNumber, sectionTitle);
  }
}

function generateMockSection(
  system: SystemMetadata & { riskTier: string },
  sectionNumber: number,
  sectionTitle: string
): string {
  return `## Section ${sectionNumber}: ${sectionTitle}

### System: ${system.name}
**Sector:** ${system.sector}
**Risk Tier:** ${system.riskTier.toUpperCase()}
**Use Case:** ${system.useCase}

---

[ACTION REQUIRED: Provide detailed information for this section]

This section of the Annex IV technical documentation covers ${sectionTitle.toLowerCase()} for the "${system.name}" AI system deployed in the ${system.sector} sector.

Per Article 11 of the EU AI Act, providers of high-risk AI systems shall draw up technical documentation before the system is placed on the market or put into service. This documentation shall be drawn up in such a way as to demonstrate that the high-risk AI system complies with the requirements set out in Chapter 2.

[ACTION REQUIRED: Complete this section with system-specific details before the August 2, 2026 enforcement deadline]

---
*Generated by ComplianceForge — ${new Date().toISOString().split("T")[0]}*`;
}
