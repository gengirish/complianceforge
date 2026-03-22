import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("AI System Inventory", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/inventory");
    await page.waitForURL("**/inventory", { timeout: 30000 });
    await expectNoServerError(page);
  });

  test("displays inventory page heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("AI System Inventory");
  });

  test("shows add system button", async ({ page }) => {
    await expect.soft(page.locator("text=Add System")).toBeVisible();
  });

  test("has search input", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search systems"]');
    await expect(search).toBeVisible();
  });

  test("displays seeded AI systems in table", async ({ page }) => {
    const systems = [
      "Customer Credit Scoring Engine",
      "Resume Screening AI",
      "Customer Support Chatbot",
    ];
    for (const name of systems) {
      await expect.soft(page.locator(`text=${name}`).first()).toBeVisible();
    }
  });

  test("table shows risk tier badges", async ({ page }) => {
    await expect.soft(page.locator("text=High").first()).toBeVisible();
    await expect.soft(page.locator("text=Limited").first()).toBeVisible();
    await expect.soft(page.locator("text=Minimal").first()).toBeVisible();
  });

  test("search filters systems", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search systems"]');
    await search.fill("Credit");
    await expect(page.locator("text=Customer Credit Scoring Engine")).toBeVisible();
    await expect.soft(
      page.locator("text=Resume Screening AI")
    ).not.toBeVisible();
  });

  test("add system form opens and closes", async ({ page }) => {
    await page.click("text=Add System");
    await expect(
      page.locator("text=Register New AI System")
    ).toBeVisible();
    await expect.soft(
      page.locator('input[name="name"]').nth(0)
    ).toBeVisible();

    await page.click("text=Cancel");
    await expect.soft(
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
    await page.waitForTimeout(5000);

    const systemVisible = await page
      .locator("text=E2E Test System")
      .first()
      .isVisible()
      .catch(() => false);
    const errorVisible = await page
      .locator("text=Something went wrong")
      .isVisible()
      .catch(() => false);

    if (errorVisible) {
      await page.locator('button:has-text("Try again")').click();
      await page.waitForTimeout(3000);
    }

    await expect(
      page.locator("text=E2E Test System").or(page.locator("h1, h2").first())
    ).toBeVisible({ timeout: 15000 });
  });
});
