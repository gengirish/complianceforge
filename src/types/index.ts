import { z } from "zod";

export const riskTierSchema = z.enum([
  "unacceptable",
  "high",
  "limited",
  "minimal",
  "unassessed",
]);
export type RiskTier = z.infer<typeof riskTierSchema>;

export const complianceStatusSchema = z.enum([
  "compliant",
  "partially_compliant",
  "non_compliant",
  "under_review",
  "not_started",
]);
export type ComplianceStatus = z.infer<typeof complianceStatusSchema>;

export const userRoleSchema = z.enum([
  "admin",
  "compliance_officer",
  "auditor",
  "viewer",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const createAiSystemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  sector: z.string().min(1, "Sector is required"),
  useCase: z.string().min(1, "Use case is required"),
  provider: z.string().optional(),
  version: z.string().optional(),
  dataInputs: z.string().optional(),
  decisionImpact: z.string().optional(),
  endUsers: z.string().optional(),
  deploymentRegion: z.string().default("EU"),
});
export type CreateAiSystemInput = z.infer<typeof createAiSystemSchema>;

export const classifySystemSchema = z.object({
  systemId: z.string().uuid(),
});
export type ClassifySystemInput = z.infer<typeof classifySystemSchema>;

export const generateDocumentSchema = z.object({
  systemId: z.string().uuid(),
  sectionNumbers: z.array(z.number().min(1).max(17)).optional(),
});
export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;

export interface ComplianceSummary {
  totalSystems: number;
  byRiskTier: Record<RiskTier, number>;
  byStatus: Record<ComplianceStatus, number>;
  averageScore: number;
  criticalGaps: number;
  daysUntilEnforcement: number;
}

export const EU_AI_ACT_SECTORS = [
  "Healthcare",
  "Financial Services",
  "Education",
  "Law Enforcement",
  "Migration & Border Control",
  "Justice & Democracy",
  "Employment & HR",
  "Critical Infrastructure",
  "Biometric Identification",
  "Transport",
  "Environment",
  "Consumer Products",
  "Manufacturing",
  "Agriculture",
  "Telecommunications",
  "Public Administration",
  "Other",
] as const;

export const ANNEX_IV_SECTIONS = [
  { number: 1, title: "General Description" },
  { number: 2, title: "Detailed Description of Elements" },
  { number: 3, title: "Intended Purpose" },
  { number: 4, title: "Risk Management" },
  { number: 5, title: "Data Governance" },
  { number: 6, title: "Training Methodology" },
  { number: 7, title: "Testing & Validation" },
  { number: 8, title: "Performance Metrics" },
  { number: 9, title: "Cybersecurity" },
  { number: 10, title: "Logging Capabilities" },
  { number: 11, title: "Human Oversight" },
  { number: 12, title: "Transparency" },
  { number: 13, title: "Conformity Assessment" },
  { number: 14, title: "Post-Market Monitoring" },
  { number: 15, title: "Standards & Certifications" },
  { number: 16, title: "EU Database Registration" },
  { number: 17, title: "Change Log" },
] as const;
