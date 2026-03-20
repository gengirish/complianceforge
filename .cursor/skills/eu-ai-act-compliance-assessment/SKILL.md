---
name: eu-ai-act-compliance-assessment
description: >-
  Classify AI systems by EU AI Act risk tier with legal justification.
  Use when assessing risk levels, classifying AI systems, checking Article 5 prohibitions,
  evaluating Annex III high-risk categories, or performing compliance gap analysis.
---

# EU AI Act Compliance Assessment

## Risk Classification Decision Tree

When classifying an AI system, follow this exact sequence:

### Step 1: Check Prohibited Practices (Article 5)
Return `UNACCEPTABLE` if the system:
- Uses subliminal, manipulative, or deceptive techniques causing significant harm
- Exploits vulnerabilities of specific groups (age, disability, social/economic situation)
- Performs social scoring by public authorities
- Uses real-time remote biometric identification in public spaces (law enforcement exceptions apply)
- Creates facial recognition databases via untargeted scraping
- Performs emotion recognition in workplace or education
- Uses biometric categorization to infer sensitive attributes (race, political opinions, religion)
- Performs individual predictive policing based solely on profiling

### Step 2: Check High-Risk (Article 6 + Annex III)
Return `HIGH` if the system falls under any Annex III category:

| # | Category | Examples |
|---|----------|----------|
| 1 | Biometric identification | Remote biometric ID, emotion recognition (where permitted) |
| 2 | Critical infrastructure | Safety components in water, gas, electricity, transport |
| 3 | Education & training | Student admission scoring, exam proctoring, learning adaptation |
| 4 | Employment & workers | CV screening, interview scoring, task allocation, monitoring |
| 5 | Essential services access | Credit scoring, insurance pricing, public benefit eligibility |
| 6 | Law enforcement | Evidence evaluation, recidivism prediction, profiling |
| 7 | Migration & border | Lie detection, travel document authentication, visa processing |
| 8 | Justice & democracy | Legal research, sentencing assistance, dispute resolution |

Also `HIGH` if: safety component of a product covered by EU harmonized legislation (Annex I) requiring third-party conformity assessment.

**Exception (Art. 6(3))**: An Annex III system is NOT high-risk if it:
- Performs a narrow procedural task
- Improves the result of a previously completed human activity
- Detects decision-making patterns without replacing human assessment
- Performs a preparatory task for an assessment listed in Annex III

### Step 3: Check Limited Risk (Article 50)
Return `LIMITED` if the system has transparency obligations:
- Chatbots / conversational AI (must disclose AI interaction)
- Deepfake generators (must label AI-generated content)
- Emotion recognition systems (must inform subjects)
- Biometric categorization (must inform subjects)
- AI-generated text published to inform the public (must label)

### Step 4: Default to Minimal Risk
Return `MINIMAL` for all other AI systems. No mandatory requirements but voluntary codes of conduct encouraged.

## Claude API Classification Prompt Template

When calling Claude for risk classification, structure the prompt as:

```
You are an EU AI Act compliance expert. Classify the following AI system:

System Name: {name}
Sector: {sector}
Use Case Description: {use_case}
Data Inputs: {data_inputs}
Decision Impact: {decision_impact}
End Users: {end_users}
Deployment Region: {deployment_region}

Provide:
1. risk_tier: "unacceptable" | "high" | "limited" | "minimal"
2. confidence: 0.0-1.0
3. justification: 2-3 sentence legal reasoning citing specific articles
4. key_articles: array of relevant article numbers
5. requirements: array of compliance requirements for this tier
6. recommendations: array of next steps
7. exceptions_considered: any Article 6(3) exceptions evaluated

Respond in JSON format.
```

## Requirements by Risk Tier

### High-Risk Requirements
- Risk Management System (Art. 9)
- Data Governance (Art. 10)
- Technical Documentation — Annex IV (Art. 11)
- Record-Keeping / Logging (Art. 12)
- Transparency to Deployers (Art. 13)
- Human Oversight (Art. 14)
- Accuracy, Robustness, Cybersecurity (Art. 15)
- Quality Management System (Art. 17)
- Conformity Assessment (Art. 43)
- EU Database Registration (Art. 49)
- Post-Market Monitoring (Art. 72)
- Serious Incident Reporting (Art. 62)

### Limited-Risk Requirements
- Transparency disclosure to users (Art. 50)
- Content labeling for AI-generated media (Art. 50)

### Minimal-Risk Recommendations
- Voluntary codes of conduct (Art. 95)
- Basic documentation best practices

## Sector-Specific Guidance

### Healthcare
Cross-reference with Medical Device Regulation (MDR) 2017/745. AI systems qualifying as medical devices are automatically high-risk.

### Financial Services
Cross-reference with DORA (Digital Operational Resilience Act). Credit scoring systems are explicitly listed in Annex III(5)(b).

### Public Sector
Cross-reference with national AI strategies and existing public sector AI guidelines per member state.

## Gap Analysis Output Format

After classification, generate a gap analysis:

```json
{
  "system_name": "...",
  "risk_tier": "high",
  "compliance_gaps": [
    {
      "requirement": "Technical Documentation (Art. 11)",
      "status": "not_started",
      "priority": "critical",
      "effort_estimate": "2-4 weeks",
      "remediation": "Generate Annex IV documentation using doc generator"
    }
  ],
  "compliance_score": 35,
  "next_deadline": "2026-08-02",
  "days_remaining": 135
}
```
