import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ComplianceForge — EU AI Act Compliance Platform",
  description:
    "AI-powered EU AI Act compliance platform. Classify risk, generate documentation, track audit trails. Enforcement deadline: August 2, 2026.",
  keywords: [
    "EU AI Act",
    "compliance",
    "risk classification",
    "Annex IV",
    "technical documentation",
    "AI governance",
  ],
  metadataBase: new URL("https://complianceforge-ai.com"),
  openGraph: {
    title: "ComplianceForge — EU AI Act Compliance in Minutes",
    description:
      "AI-powered compliance platform. Classify risk, generate Annex IV docs, maintain audit trails. Powered by Claude AI.",
    url: "https://complianceforge-ai.com",
    siteName: "ComplianceForge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ComplianceForge — EU AI Act Compliance Platform",
    description:
      "Turn 6-month compliance engagements into 6-minute automated workflows.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
