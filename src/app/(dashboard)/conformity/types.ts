import type { StoredConformityRequirement } from "@/lib/conformity-requirements";

export type SerializedConformityAssessment = {
  id: string;
  aiSystemId: string;
  aiSystemName: string;
  assessorId: string;
  status: string;
  completionPct: number;
  requirements: StoredConformityRequirement[];
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type SerializedHighRiskSystem = {
  id: string;
  name: string;
  sector: string;
  useCase: string;
};
