import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
  });

  test("displays dashboard heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Compliance Dashboard");
  });

  test("shows 4 stat cards", async ({ page }) => {
    const statLabels = [
      "Total AI Systems",
      "High-Risk Systems",
      "Avg. Compliance Score",
      "Days to Deadline",
    ];
    for (const label of statLabels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test("shows quick actions section", async ({ page }) => {
    await expect(page.locator("text=Quick Actions")).toBeVisible();
    await expect(page.locator("text=Add AI System")).toBeVisible();
    await expect(page.locator("text=Classify Risk")).toBeVisible();
    await expect(page.locator("text=Generate Documentation")).toBeVisible();
    await expect(page.locator("text=View Audit Trail")).toBeVisible();
  });

  test("shows recent activity section", async ({ page }) => {
    await expect(page.locator("text=Recent Activity")).toBeVisible();
  });

  test("sidebar navigation is visible", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator("a:has-text('AI Inventory')")).toBeVisible();
    await expect(
      sidebar.locator("a:has-text('Risk Classifier')")
    ).toBeVisible();
    await expect(sidebar.locator("a:has-text('Documents')")).toBeVisible();
    await expect(sidebar.locator("a:has-text('Audit Trail')")).toBeVisible();
    await expect(sidebar.locator("a:has-text('Incidents')")).toBeVisible();
    await expect(sidebar.locator("a:has-text('Calendar')")).toBeVisible();
    await expect(sidebar.locator("a:has-text('Conformity')")).toBeVisible();
    await expect(
      sidebar.locator("a:has-text('GitHub Scanner')")
    ).toBeVisible();
  });

  test("sidebar shows enforcement deadline", async ({ page }) => {
    await expect(page.locator("text=Enforcement Deadline")).toBeVisible();
    await expect(page.locator("text=August 2, 2026")).toBeVisible();
  });

  test("navigate to inventory from quick actions", async ({ page }) => {
    await page.click("text=Add AI System");
    await page.waitForURL("**/inventory", { timeout: 15000 });
    await expect(page.url()).toContain("/inventory");
  });

  test("navigate to classifier from sidebar", async ({ page }) => {
    await page.locator('a:has-text("Risk Classifier")').click();
    await page.waitForURL("**/classifier", { timeout: 15000 });
    await expect(page.url()).toContain("/classifier");
  });
});
