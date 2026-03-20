---
name: annex-iv-doc-generator
description: >-
  Generate EU AI Act Annex IV technical documentation for AI systems.
  Use when creating compliance documents, technical documentation,
  risk management plans, or any Article 11 documentation requirements.
---

# Annex IV Technical Documentation Generator

## Annex IV Structure (17 Required Sections)

Generate documentation following this exact structure for high-risk AI systems:

### Section 1: General Description
- System name, version, and intended purpose
- Provider name, address, contact details
- Date of first placing on market / putting into service
- Hardware and software prerequisites
- How the AI system interacts with other hardware/software

### Section 2: Detailed Description of Elements
- Development methodology and techniques
- System architecture and computational resources
- Design specifications (logic, algorithms, key design choices)
- Data processing approach (data flows, data handling)
- Human oversight measures and mechanisms
- Pre-determined changes and update procedures

### Section 3: Intended Purpose
- Specific intended purpose of the AI system
- Geographic, behavioral, and functional scope
- Who will use it (deployers, affected persons)
- Foreseeable misuse and safeguards

### Section 4: Risk Management
- Summary of the risk management system (Art. 9)
- Identified risks and risk assessment results
- Risk mitigation measures implemented
- Residual risks and their acceptability
- Testing to identify risks

### Section 5: Data Governance
- Training, validation, and testing datasets description
- Data collection methodology and sources
- Data preparation operations (annotation, labeling, cleaning)
- Data relevance, representativeness, and bias assessment
- Data gap identification and remediation

### Section 6: Training Methodology
- Training techniques and approaches used
- Training data selection and preparation
- Hyperparameters and optimization choices
- Validation methodology and metrics

### Section 7: Testing & Validation
- Testing procedures and results
- Validation metrics (accuracy, robustness, cybersecurity)
- Performance benchmarks and thresholds
- Testing data separate from training data

### Section 8: Performance Metrics
- Accuracy metrics (precision, recall, F1, AUC-ROC)
- Robustness testing results
- Performance across different demographic groups
- Known limitations and failure modes

### Section 9: Cybersecurity
- Cybersecurity measures implemented
- Adversarial robustness testing
- Data integrity protections
- Vulnerability assessment results

### Section 10: Logging Capabilities
- Automatic logging functions (Art. 12)
- Log format and retention period
- Events logged (inputs, outputs, anomalies)
- Log access controls

### Section 11: Human Oversight
- Human oversight measures (Art. 14)
- Ability for humans to understand system outputs
- Ability to override or reverse decisions
- Monitoring mechanisms for real-time operation

### Section 12: Transparency
- Information provided to deployers (Art. 13)
- Instructions for use
- Transparency of AI-generated content
- Contact information for queries

### Section 13: Conformity Assessment
- Assessment procedure followed (Art. 43)
- Whether internal control (Annex VI) or third-party (Annex VII)
- Notified body details (if applicable)
- EU Declaration of Conformity summary

### Section 14: Post-Market Monitoring
- Post-market monitoring plan (Art. 72)
- Performance monitoring methodology
- Incident reporting procedures (Art. 62)
- Continuous improvement processes

### Section 15: Standards & Certifications
- Harmonized standards applied
- Common specifications followed
- ISO certifications (ISO 42001 if applicable)
- Industry-specific standards

### Section 16: EU Database Registration
- Information submitted to EU database (Art. 49)
- Registration number
- Updates to registration

### Section 17: Change Log
- Version history
- Changes from previous versions
- Impact assessment of changes

## Claude API Documentation Prompt

```
You are a technical writer specializing in EU AI Act compliance.
Generate Section {section_number}: {section_title} of Annex IV documentation.

System metadata:
- Name: {name}
- Sector: {sector}
- Risk Tier: {risk_tier}
- Use Case: {use_case}
- Technology Stack: {tech_stack}
- Data Sources: {data_sources}

Generate professional, legally-sound documentation that would satisfy
an EU AI Act conformity assessment. Include specific, measurable details
where possible. Flag areas where the provider must supply additional
information with [ACTION REQUIRED: ...] markers.

Output format: Markdown with proper heading hierarchy.
```

## Document Lifecycle

1. **Draft**: Claude generates initial documentation from system metadata
2. **Review**: Compliance officer reviews and fills [ACTION REQUIRED] sections
3. **Approve**: Legal review and sign-off
4. **Publish**: Store as versioned, immutable record
5. **Update**: Regenerate when system changes, track diffs
