export type ConformityCategory =
  | "risk_management"
  | "data_governance"
  | "transparency"
  | "human_oversight"
  | "accuracy"
  | "robustness"
  | "cybersecurity"
  | "record_keeping";

export type ConformityRequirementDef = {
  id: string;
  articleRef: string;
  title: string;
  description: string;
  category: ConformityCategory;
  evidenceRequired: string[];
};

/** Per-requirement state stored in ConformityAssessment.requirements JSON */
export type StoredConformityRequirement = {
  id: string;
  met: boolean;
  evidenceUrl: string;
  notes: string;
};

export const CONFORMITY_CATEGORY_ORDER: ConformityCategory[] = [
  "risk_management",
  "data_governance",
  "record_keeping",
  "transparency",
  "human_oversight",
  "accuracy",
  "robustness",
  "cybersecurity",
];

export const CONFORMITY_CATEGORY_LABELS: Record<ConformityCategory, string> = {
  risk_management: "Risk management (Art. 9)",
  data_governance: "Data governance (Art. 10)",
  record_keeping: "Documentation & logging (Art. 11–12)",
  transparency: "Transparency (Art. 13)",
  human_oversight: "Human oversight (Art. 14)",
  accuracy: "Accuracy (Art. 15)",
  robustness: "Robustness (Art. 15)",
  cybersecurity: "Cybersecurity (Art. 15)",
};

/**
 * EU AI Act high-risk conformity checklist mapped to Articles 8–15
 * (implementation obligations for providers under Chapter III, Section 2).
 */
export const CONFORMITY_REQUIREMENTS: ConformityRequirementDef[] = [
  {
    id: "art8-1",
    articleRef: "Article 8(1)",
    title: "Conformity with Section 2 requirements",
    description:
      "The AI system complies with the requirements laid down in Chapter III, Section 2, in design and when placed on the market or put into service.",
    category: "risk_management",
    evidenceRequired: ["Conformity checklist", "Gap analysis", "Sign-off record"],
  },
  {
    id: "art9-1",
    articleRef: "Article 9(2)",
    title: "Risk management system",
    description:
      "A risk management system is established, implemented, documented, and maintained throughout the AI system’s lifecycle.",
    category: "risk_management",
    evidenceRequired: ["Risk management procedure", "Lifecycle RACI", "Tooling references"],
  },
  {
    id: "art9-2",
    articleRef: "Article 9(3)–(5)",
    title: "Risk identification, evaluation, and mitigation",
    description:
      "Known and foreseeable risks are identified and analysed; residual risks are evaluated and suitable measures adopted, including post-market monitoring inputs.",
    category: "risk_management",
    evidenceRequired: ["Risk register", "Mitigation log", "Post-market feedback loop"],
  },
  {
    id: "art10-1",
    articleRef: "Article 10(2)(a)–(d)",
    title: "Training, validation, and testing data",
    description:
      "Relevant design choices and data selection are documented; data is suitable, representative, and subject to appropriate governance (including, where applicable, examination of possible biases).",
    category: "data_governance",
    evidenceRequired: ["Data cards", "Dataset documentation", "Split methodology"],
  },
  {
    id: "art10-2",
    articleRef: "Article 10(2)(f)",
    title: "Bias detection and mitigation",
    description:
      "Appropriate measures for detection, correction, and mitigation of biases that could affect health, safety, or fundamental rights.",
    category: "data_governance",
    evidenceRequired: ["Bias assessment", "Fairness metrics", "Remediation plan"],
  },
  {
    id: "art10-3",
    articleRef: "Article 10(5)",
    title: "Special categories and protected characteristics",
    description:
      "Where applicable, measures concerning persons belonging to vulnerable groups or special categories under Union law.",
    category: "data_governance",
    evidenceRequired: ["DPIA or equivalent", "Safeguards list", "Legal basis summary"],
  },
  {
    id: "art11-1",
    articleRef: "Article 11 & Annex IV",
    title: "Technical documentation",
    description:
      "Technical documentation is drawn up before the system is placed on the market and kept up to date, covering Annex IV elements as applicable.",
    category: "record_keeping",
    evidenceRequired: ["Annex IV pack", "Version history", "Architecture diagrams"],
  },
  {
    id: "art11-2",
    articleRef: "Article 11",
    title: "Instructions for use and updates",
    description:
      "Instructions for use and documentation are provided to deployers and revised when the system or its performance characteristics change materially.",
    category: "record_keeping",
    evidenceRequired: ["IFU / operator manual", "Change log", "Release notes"],
  },
  {
    id: "art12-1",
    articleRef: "Article 12(1)",
    title: "Automatic logging capability",
    description:
      "The system is designed and developed with logging capabilities that record operationally relevant events during the period the system is under the provider’s control, where technically feasible.",
    category: "record_keeping",
    evidenceRequired: ["Logging specification", "Sample log extracts", "Retention policy"],
  },
  {
    id: "art12-2",
    articleRef: "Article 12(2)",
    title: "Log accessibility and retention",
    description:
      "Logs are retained appropriately, kept readable, and available to competent authorities upon request within applicable limits.",
    category: "record_keeping",
    evidenceRequired: ["Retention schedule", "Access procedure", "Security controls for logs"],
  },
  {
    id: "art13-1",
    articleRef: "Article 13(3)(a)–(b)",
    title: "Information for deployers",
    description:
      "Deployers receive clear instructions and information on human oversight, technical capabilities and limitations, and foreseeable risks.",
    category: "transparency",
    evidenceRequired: ["Deployer pack", "Limitations sheet", "Contact / escalation"],
  },
  {
    id: "art13-2",
    articleRef: "Article 13(3)(d)–(f)",
    title: "Performance and interaction transparency",
    description:
      "Information on performance metrics, robustness, and how inputs affect outputs is communicated so deployers can interpret system behaviour.",
    category: "transparency",
    evidenceRequired: ["Model cards", "Evaluation reports", "Known failure modes"],
  },
  {
    id: "art13-3",
    articleRef: "Article 13(3)(h)",
    title: "Lifecycle and maintenance information",
    description:
      "Deployers are informed of required maintenance, updates, and expected lifetime or re-training needs.",
    category: "transparency",
    evidenceRequired: ["Maintenance plan", "Update policy", "EOL statement"],
  },
  {
    id: "art14-1",
    articleRef: "Article 14(2)(a)–(c)",
    title: "Human oversight measures",
    description:
      "Measures enable overseers to understand system capabilities and limitations, monitor operation, interpret outputs, and detect anomalies or dysfunctions.",
    category: "human_oversight",
    evidenceRequired: ["HITL procedures", "Monitoring dashboards", "Training records"],
  },
  {
    id: "art14-2",
    articleRef: "Article 14(4)",
    title: "Override, interrupt, and stop",
    description:
      "Ability for humans to override, reverse, or stop the system when a risk materialises, without degrading other safety functions.",
    category: "human_oversight",
    evidenceRequired: ["Kill-switch design", "Runbooks", "Test evidence"],
  },
  {
    id: "art15-1",
    articleRef: "Article 15(1)",
    title: "Accuracy for intended purpose",
    description:
      "Appropriate levels of accuracy, including metrics, are achieved and documented for the intended purpose and target population.",
    category: "accuracy",
    evidenceRequired: ["Accuracy metrics", "Acceptance criteria", "Validation results"],
  },
  {
    id: "art15-2",
    articleRef: "Article 15(2)(a)",
    title: "Resilience to errors and faults",
    description:
      "Resilience against errors, faults, inconsistencies, and unexpected input within the operating environment.",
    category: "robustness",
    evidenceRequired: ["Error handling spec", "Chaos / fault tests", "Fallback behaviour"],
  },
  {
    id: "art15-3",
    articleRef: "Article 15(2)(b)",
    title: "Environmental and operational resilience",
    description:
      "Robustness to environmental factors, use conditions, and adversarially typical perturbations relevant to the deployment context.",
    category: "robustness",
    evidenceRequired: ["Stress tests", "OOD handling", "Deployment constraints"],
  },
  {
    id: "art15-4",
    articleRef: "Article 15(3)–(4)",
    title: "Cybersecurity and access control",
    description:
      "Measures resist unauthorised access, misuse, and attempts to alter use or performance; security properties are appropriate to the risks.",
    category: "cybersecurity",
    evidenceRequired: ["Threat model", "Security tests", "Access control design"],
  },
  {
    id: "art15-5",
    articleRef: "Article 15(5)",
    title: "Ongoing security and incident readiness",
    description:
      "Processes for vulnerability management, patching, and coordination with serious incident reporting obligations where applicable.",
    category: "cybersecurity",
    evidenceRequired: ["Vuln disclosure process", "Patch SLAs", "Incident playbooks"],
  },
];

export function buildInitialRequirementState(): StoredConformityRequirement[] {
  return CONFORMITY_REQUIREMENTS.map((r) => ({
    id: r.id,
    met: false,
    evidenceUrl: "",
    notes: "",
  }));
}

export function mergeRequirementState(
  stored: StoredConformityRequirement[] | null | undefined
): StoredConformityRequirement[] {
  const byId = new Map((stored ?? []).map((s) => [s.id, s]));
  return CONFORMITY_REQUIREMENTS.map((def) => {
    const s = byId.get(def.id);
    return {
      id: def.id,
      met: s?.met ?? false,
      evidenceUrl: s?.evidenceUrl ?? "",
      notes: s?.notes ?? "",
    };
  });
}

/**
 * Completion = share of requirements marked as met (0–100).
 */
export function calculateCompletionPercentage(
  requirements: Pick<StoredConformityRequirement, "met">[]
): number {
  if (!requirements.length) return 0;
  const met = requirements.filter((r) => r.met).length;
  return Math.round((met / requirements.length) * 100);
}

export function collectEvidenceUrls(requirements: StoredConformityRequirement[]): string[] {
  const urls = requirements
    .map((r) => r.evidenceUrl.trim())
    .filter(Boolean);
  return [...new Set(urls)];
}
