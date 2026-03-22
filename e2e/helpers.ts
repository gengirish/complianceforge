import { Page, expect } from "@playwright/test";

export async function loginAsDemo(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@complianceforge-ai.com");
  await page.fill('input[name="name"]', "Demo User");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
}

export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("domcontentloaded");
}

export async function expectNoServerError(page: Page): Promise<void> {
  const body = await page.textContent("body");
  expect(body).not.toContain("This page couldn't load");
  expect(body).not.toContain("Internal Server Error");
}
