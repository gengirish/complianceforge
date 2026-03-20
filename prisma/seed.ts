import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const org = await prisma.organization.upsert({
    where: { id: "demo-org-001" },
    update: {},
    create: {
      id: "demo-org-001",
      name: "Demo Organization",
      plan: "growth",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@complianceforge-ai.com" },
    update: {},
    create: {
      email: "demo@complianceforge-ai.com",
      name: "Demo User",
      role: "admin",
      organizationId: org.id,
    },
  });

  const systems = [
    {
      name: "Customer Credit Scoring Engine",
      sector: "Financial Services",
      useCase: "Automated credit scoring for loan applications using ML models trained on customer financial history",
      dataInputs: "Credit history, income data, employment records, transaction patterns",
      decisionImpact: "Determines credit eligibility and loan terms for consumer lending",
      endUsers: "Loan officers, automated lending platform",
      riskTier: "high",
      complianceStatus: "under_review",
      complianceScore: 35,
    },
    {
      name: "Resume Screening AI",
      sector: "Employment & HR",
      useCase: "Automated CV screening and candidate ranking for job applications",
      dataInputs: "Resumes, job descriptions, historical hiring data",
      decisionImpact: "Filters candidates for interview consideration",
      endUsers: "HR recruiters, hiring managers",
      riskTier: "high",
      complianceStatus: "not_started",
      complianceScore: 10,
    },
    {
      name: "Customer Support Chatbot",
      sector: "Consumer Products",
      useCase: "AI-powered chatbot for handling customer service inquiries and FAQ responses",
      dataInputs: "Customer messages, product catalog, FAQ database",
      decisionImpact: "Provides automated responses, escalates complex issues to humans",
      endUsers: "End customers, support team",
      riskTier: "limited",
      complianceStatus: "partially_compliant",
      complianceScore: 65,
    },
    {
      name: "Predictive Maintenance System",
      sector: "Manufacturing",
      useCase: "ML model predicting equipment failures based on sensor data for preventive maintenance scheduling",
      dataInputs: "IoT sensor data, maintenance logs, environmental conditions",
      decisionImpact: "Recommends maintenance schedules, no direct safety impact",
      endUsers: "Maintenance engineers, plant managers",
      riskTier: "minimal",
      complianceStatus: "compliant",
      complianceScore: 90,
    },
    {
      name: "Medical Image Diagnostic AI",
      sector: "Healthcare",
      useCase: "Deep learning model for detecting anomalies in X-ray and MRI scans to assist radiologists",
      dataInputs: "Medical imaging data (X-rays, MRIs), patient metadata",
      decisionImpact: "Assists in medical diagnosis, flagging potential pathologies",
      endUsers: "Radiologists, physicians",
      riskTier: "high",
      complianceStatus: "under_review",
      complianceScore: 25,
    },
    {
      name: "Content Recommendation Engine",
      sector: "Telecommunications",
      useCase: "Personalized content and product recommendations based on user behavior and preferences",
      dataInputs: "User browsing history, purchase data, preferences",
      decisionImpact: "Suggests content and products, no binding decisions",
      endUsers: "Platform users, marketing team",
      riskTier: "minimal",
      complianceStatus: "compliant",
      complianceScore: 85,
    },
  ];

  for (const sysData of systems) {
    const system = await prisma.aiSystem.create({
      data: {
        ...sysData,
        deploymentRegion: "EU",
        organizationId: org.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        aiSystemId: system.id,
        action: "create",
        resource: "ai_system",
        resourceId: system.id,
        details: `Created AI system: ${system.name}`,
      },
    });

    if (sysData.riskTier !== "unassessed") {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          aiSystemId: system.id,
          action: "classify",
          resource: "assessment",
          resourceId: system.id,
          details: `Classified "${system.name}" as ${sysData.riskTier.toUpperCase()} risk`,
        },
      });
    }
  }

  console.log(`Seeded: 1 org, 1 user, ${systems.length} AI systems`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
