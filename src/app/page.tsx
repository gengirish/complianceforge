import Link from "next/link";
import {
  Shield,
  FileText,
  GitBranch,
  BarChart3,
  Clock,
  AlertTriangle,
} from "lucide-react";

const ENFORCEMENT_DATE = new Date("2026-08-02T00:00:00Z");

function getDaysRemaining(): number {
  const now = new Date();
  const diff = ENFORCEMENT_DATE.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const features = [
  {
    icon: Shield,
    title: "Risk Classifier Engine",
    description:
      "Claude-powered risk tier classification with full legal justification citing specific EU AI Act articles.",
    articles: "Art. 5, 6, Annex III",
  },
  {
    icon: FileText,
    title: "Doc Generator",
    description:
      "Auto-generate all 17 sections of Annex IV technical documentation from your system metadata.",
    articles: "Art. 11, Annex IV",
  },
  {
    icon: GitBranch,
    title: "GitHub Scanner",
    description:
      "Scan your repositories for AI model usage and auto-populate your compliance inventory.",
    articles: "Art. 6, 49",
  },
  {
    icon: BarChart3,
    title: "Compliance Dashboard",
    description:
      "Real-time compliance scores, risk distribution, and gap analysis across all your AI systems.",
    articles: "Art. 9, 17",
  },
  {
    icon: Clock,
    title: "Audit Trail",
    description:
      "Immutable, tamper-evident audit logging with 10-year retention for every compliance action.",
    articles: "Art. 12",
  },
  {
    icon: AlertTriangle,
    title: "Incident Reporter",
    description:
      "Detect, classify, and report serious AI incidents to National Competent Authorities within 15 days.",
    articles: "Art. 62",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    systems: "Up to 3 AI systems",
    features: [
      "Risk classification",
      "Basic inventory",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "€99",
    period: "/month",
    systems: "Up to 15 AI systems",
    features: [
      "Everything in Free",
      "Document generator",
      "Audit trail",
      "Email support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "€299",
    period: "/month",
    systems: "Up to 100 AI systems",
    features: [
      "Everything in Starter",
      "GitHub scanner",
      "Conformity assessment",
      "Compliance calendar",
      "API access",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "€999",
    period: "/month",
    systems: "Unlimited AI systems",
    features: [
      "Everything in Growth",
      "SSO (SAML/OIDC)",
      "Multi-tenant",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function LandingPage() {
  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen bg-background">
      {/* Urgency Banner */}
      <div className="bg-risk-high/10 border-b border-risk-high/20 px-4 py-2 text-center">
        <p className="text-sm font-medium text-risk-high">
          EU AI Act enforcement in{" "}
          <span className="font-bold">{daysRemaining} days</span> (August 2,
          2026) — Fines up to €35M or 7% global turnover
        </p>
      </div>

      {/* Hero */}
      <header className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <Shield className="h-4 w-4" />
          AI-Native Compliance Platform
        </div>
        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          EU AI Act Compliance
          <br />
          <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            in Minutes, Not Months
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
          ComplianceForge turns a 6-month consulting engagement into a 6-minute
          automated workflow. Classify risk, generate Annex IV documentation,
          and maintain continuous compliance — powered by Claude AI.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Start Free — No Card Required
          </Link>
          <Link
            href="#features"
            className="rounded-lg border border-border px-8 py-3 text-lg font-semibold transition hover:bg-accent"
          >
            See Features
          </Link>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold">
          Everything You Need for EU AI Act Compliance
        </h2>
        <p className="mb-16 text-center text-muted-foreground">
          From risk classification to conformity assessment — one platform,
          every article.
        </p>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-lg"
            >
              <feature.icon className="mb-4 h-10 w-10 text-primary" />
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="mb-3 text-muted-foreground">
                {feature.description}
              </p>
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {feature.articles}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold">
          Simple, Transparent Pricing
        </h2>
        <p className="mb-16 text-center text-muted-foreground">
          Start free. Scale as your AI portfolio grows.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-6 ${
                tier.highlighted
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlighted && (
                <span className="mb-4 inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold">{tier.name}</h3>
              <div className="my-4">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {tier.systems}
              </p>
              <ul className="mb-6 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-primary">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full rounded-lg px-4 py-2 font-semibold transition ${
                  tier.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-accent"
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p className="mb-2 font-semibold text-foreground">ComplianceForge</p>
          <p>
            AI-powered EU AI Act compliance. Because compliance shouldn&apos;t
            require a consulting army.
          </p>
          <p className="mt-4">&copy; 2026 ComplianceForge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
