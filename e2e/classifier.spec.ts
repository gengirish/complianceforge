import { test, expect } from "@playwright/test";

test.describe("Risk Classifier", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/classifier");
    await page.waitForURL("**/classifier", { timeout: 30000 });
  });

  test("displays classifier page heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Risk Classifier Engine");
  });

  test("shows article references in subtitle", async ({ page }) => {
    await expect(page.locator("text=Articles 5, 6").first()).toBeVisible();
  });

  test("shows system selector panel", async ({ page }) => {
    await expect(
      page.getByText("Select AI System", { exact: true })
    ).toBeVisible();
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
    await expect(
      page.locator("text=Financial Services").first()
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Classify Risk Tier")')
    ).toBeVisible();
  });

  test("classify a system returns result", async ({ page }) => {
    test.setTimeout(120000);
    await page
      .locator("button:has-text('Customer Credit Scoring Engine')")
      .click();
    await page.click('button:has-text("Classify Risk Tier")');

    await expect(page.locator("text=Confidence").first()).toBeVisible({
      timeout: 30000,
    });
  });
});
