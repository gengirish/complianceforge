import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("Document Generator", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/documents");
    await page.waitForURL("**/documents", { timeout: 30000 });
    await expectNoServerError(page);
  });

  test("displays documents page heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Document Generator");
    await expect.soft(page.locator("h1 ~ p").first()).toContainText("Annex IV");
  });

  test("shows system selector", async ({ page }) => {
    await expect.soft(page.locator("text=Select AI System")).toBeVisible();
  });

  test("selecting a system shows Annex IV sections", async ({ page }) => {
    await page
      .locator("button:has-text('Customer Credit Scoring Engine')")
      .click();

    await expect(page.locator("text=General Description")).toBeVisible();
    await expect.soft(page.locator("text=Risk Management")).toBeVisible();
    await expect.soft(page.locator("text=Data Governance")).toBeVisible();
    await expect.soft(page.locator("text=Human Oversight")).toBeVisible();
    await expect.soft(page.locator("text=Change Log")).toBeVisible();
  });

  test("shows progress bar", async ({ page }) => {
    await page
      .locator("button:has-text('Customer Credit Scoring Engine')")
      .click();
    await expect.soft(page.locator("text=Progress:")).toBeVisible();
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
    await expect.soft(page.locator("text=draft").first()).toBeVisible({
      timeout: 15000,
    });
  });
});
