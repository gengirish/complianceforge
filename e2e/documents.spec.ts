import { test, expect } from "@playwright/test";

test.describe("Document Generator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Launch Demo");
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await page.goto("/documents");
    await page.waitForURL("**/documents", { timeout: 10000 });
  });

  test("displays documents page heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Document Generator");
    await expect(page.locator("h1 ~ p").first()).toContainText("Annex IV");
  });

  test("shows system selector", async ({ page }) => {
    await expect(page.locator("text=Select AI System")).toBeVisible();
  });

  test("selecting a system shows Annex IV sections", async ({ page }) => {
    await page
      .locator("button:has-text('Customer Credit Scoring Engine')")
      .click();

    await expect(page.locator("text=General Description")).toBeVisible();
    await expect(page.locator("text=Risk Management")).toBeVisible();
    await expect(page.locator("text=Data Governance")).toBeVisible();
    await expect(page.locator("text=Human Oversight")).toBeVisible();
    await expect(page.locator("text=Change Log")).toBeVisible();
  });

  test("shows progress bar", async ({ page }) => {
    await page
      .locator("button:has-text('Customer Credit Scoring Engine')")
      .click();
    await expect(page.locator("text=Progress:")).toBeVisible();
  });

  test("generate a document section", async ({ page }) => {
    await page
      .locator("button:has-text('Customer Credit Scoring Engine')")
      .click();

    const generateBtn = page
      .locator("button:has-text('Generate')")
      .first();
    await generateBtn.click();

    await expect(page.locator("text=Generating...").first()).toBeVisible();
    await expect(page.locator("text=draft").first()).toBeVisible({
      timeout: 15000,
    });
  });
});
