import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getDaysUntilEnforcement(): number {
  const enforcement = new Date("2026-08-02T00:00:00Z");
  const now = new Date();
  const diff = enforcement.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getRiskTierColor(tier: string): string {
  const colors: Record<string, string> = {
    unacceptable: "text-risk-unacceptable bg-risk-unacceptable/10",
    high: "text-risk-high bg-risk-high/10",
    limited: "text-risk-limited bg-risk-limited/10",
    minimal: "text-risk-minimal bg-risk-minimal/10",
    unassessed: "text-muted-foreground bg-muted",
  };
  return colors[tier.toLowerCase()] ?? colors["unassessed"]!;
}

export function getComplianceScoreColor(score: number): string {
  if (score >= 80) return "text-risk-minimal";
  if (score >= 50) return "text-risk-limited";
  if (score >= 20) return "text-risk-high";
  return "text-risk-unacceptable";
}
