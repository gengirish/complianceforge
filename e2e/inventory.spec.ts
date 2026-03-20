import { test, expect } from "@playwright/test";

test.describe("AI System Inventory", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await page.goto("/inventory");
    await page.waitForURL("**/inventory", { timeout: 10000 });
  });

  test("displays inventory page heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("AI System Inventory");
  });

  test("shows add system button", async ({ page }) => {
    await expect(page.locator("text=Add System")).toBeVisible();
  });

  test("has search input", async ({ page }) => {
    const search = page.locator(
      'input[placeholder*="Search systems"]'
    );
    await expect(search).toBeVisible();
  });

  test("displays seeded AI systems in table", async ({ page }) => {
    const systems = [
      "Customer Credit Scoring Engine",
      "Resume Screening AI",
      "Customer Support Chatbot",
    ];
    for (const name of systems) {
      await expect(page.locator(`text=${name}`).first()).toBeVisible();
    }
  });

  test("table shows risk tier badges", async ({ page }) => {
    await expect(page.locator("text=High").first()).toBeVisible();
    await expect(page.locator("text=Limited").first()).toBeVisible();
    await expect(page.locator("text=Minimal").first()).toBeVisible();
  });

  test("search filters systems", async ({ page }) => {
    const search = page.locator(
      'input[placeholder*="Search systems"]'
    );
    await search.fill("Credit");
    await expect(
      page.locator("text=Customer Credit Scoring Engine")
    ).toBeVisible();
    await expect(
      page.locator("text=Resume Screening AI")
    ).not.toBeVisible();
  });

  test("add system form opens and closes", async ({ page }) => {
    await page.click("text=Add System");
    await expect(
      page.locator("text=Register New AI System")
    ).toBeVisible();
    await expect(
      page.locator('input[name="name"]').nth(0)
    ).toBeVisible();

    await page.click("text=Cancel");
    await expect(
      page.locator("text=Register New AI System")
    ).not.toBeVisible();
  });

  test("create a new AI system", async ({ page }) => {
    await page.click("text=Add System");

    await page.locator('input[name="name"]').nth(0).fill("E2E Test System");
    await page.locator('select[name="sector"]').selectOption("Healthcare");
    await page
      .locator('textarea[name="useCase"]')
      .fill("E2E test - automated diagnostic system");

    await page.click('button:has-text("Create System")');
    await page.waitForTimeout(3000);

    await expect(page.locator("text=E2E Test System").first()).toBeVisible();
  });
});
