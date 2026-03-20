import { test, expect } from "@playwright/test";

test.describe("Risk Classifier", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await page.goto("/classifier");
    await page.waitForURL("**/classifier", { timeout: 10000 });
  });

  test("displays classifier page heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Risk Classifier Engine");
    await expect(page.locator("text=Articles 5, 6")).toBeVisible();
  });

  test("shows system selector panel", async ({ page }) => {
    await expect(page.locator("text=Select AI System")).toBeVisible();
  });

  test("lists available systems", async ({ page }) => {
    await expect(
      page.locator("text=Customer Credit Scoring Engine").first()
    ).toBeVisible();
  });

  test("selecting a system shows details panel", async ({ page }) => {
    await page
      .locator("button:has-text('Customer Credit Scoring Engine')")
      .click();

    await expect(page.locator("text=System Details")).toBeVisible();
    await expect(page.locator("dd:has-text('Financial Services')")).toBeVisible();
    await expect(
      page.locator('button:has-text("Classify Risk Tier")')
    ).toBeVisible();
  });

  test("classify a system returns result", async ({ page }) => {
    await page
      .locator("button:has-text('Customer Credit Scoring Engine')")
      .click();
    await page.click('button:has-text("Classify Risk Tier")');

    await expect(
      page.locator("text=Legal Justification")
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.locator("text=Compliance Requirements")
    ).toBeVisible();
    await expect(
      page.locator("text=Recommended Next Steps")
    ).toBeVisible();
  });

  test("classification shows article references", async ({ page }) => {
    await page
      .locator("button:has-text('Customer Support Chatbot')")
      .click();
    await page.click('button:has-text("Classify Risk Tier")');

    await expect(
      page.locator("text=Article").first()
    ).toBeVisible({ timeout: 15000 });
  });
});
